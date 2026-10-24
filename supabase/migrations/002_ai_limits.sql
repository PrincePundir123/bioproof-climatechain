create table public.ai_usage(actor_id uuid not null references public.profiles(id),window_start timestamptz not null,attempts integer not null,primary key(actor_id,window_start));
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;
create function public.consume_ai_attempt(p_actor uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare used integer;
begin
 insert into ai_usage values(p_actor,date_trunc('hour',now()),1)
 on conflict(actor_id,window_start) do update set attempts=ai_usage.attempts+1 returning attempts into used;
 return used<=10;
end$$;
revoke all on function public.consume_ai_attempt(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_attempt(uuid) to service_role;
create unique index one_extraction_per_asset on public.ai_extractions(evidence_id);
