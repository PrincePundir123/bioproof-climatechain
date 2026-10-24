create table public.ai_attempt_reservations (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  reserved_at timestamptz not null default now()
);
create index ai_attempt_reservations_time on public.ai_attempt_reservations(reserved_at);
alter table public.ai_attempt_reservations enable row level security;
revoke all on public.ai_attempt_reservations from public, anon, authenticated;

-- Include recent provider successes from before this migration.
insert into public.ai_attempt_reservations(actor_id,reserved_at)
select e.uploaded_by, a.created_at
from public.ai_extractions a
join public.evidence_assets e on e.id=a.evidence_id
where a.created_at > now()-interval '24 hours';

create function public.reserve_ai_attempt(p_actor uuid) returns text
language plpgsql security definer set search_path=public as $$
begin
  -- Serialize quota checks and reservations across all application instances.
  perform pg_advisory_xact_lock(82937104);
  if (select count(*) from ai_attempt_reservations
      where reserved_at > now()-interval '24 hours') >= 100 then
    return 'DAILY_LIMIT';
  end if;
  if not consume_ai_attempt(p_actor) then
    return 'HOURLY_LIMIT';
  end if;
  insert into ai_attempt_reservations(actor_id) values(p_actor);
  -- Failed provider calls also consume budget; never refund an uncertain call.
  delete from ai_attempt_reservations where reserved_at <= now()-interval '24 hours';
  return 'ALLOWED';
end$$;
revoke all on function public.reserve_ai_attempt(uuid) from public,anon,authenticated;
grant execute on function public.reserve_ai_attempt(uuid) to service_role;
