create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id), full_name text not null, role text not null default 'FARMER' check(role in ('FARMER','COLLECTOR','PROCESSOR','AUDITOR','ADMIN')), organization_name text, region text, created_at timestamptz not null default now());
create table public.farm_plots(id uuid primary key default gen_random_uuid(), farmer_id uuid not null references public.profiles(id), display_name text not null, crop_type text not null, area_hectares numeric not null check(area_hectares>0), approximate_region text not null, private_coordinates jsonb, created_at timestamptz not null default now());
create table public.residue_batches(id text primary key, farmer_id uuid not null references public.profiles(id), plot_id uuid not null references public.farm_plots(id), status text not null check(status in ('DRAFT','DECLARED','PICKED_UP','RECEIVED','UNDER_REVIEW','APPROVED','REJECTED','DISPUTED')), document jsonb not null, version integer not null default 0, created_at timestamptz not null default now());
create table public.audit_events(id uuid primary key, batch_id text not null references public.residue_batches(id), sequence integer not null, event_hash text not null check(length(event_hash)=64), event jsonb not null, unique(batch_id,sequence));
create table public.evidence_assets(id uuid primary key, batch_id text not null references public.residue_batches(id), uploaded_by uuid not null references public.profiles(id), storage_path text not null unique, sha256_hash text not null check(length(sha256_hash)=64), file_type text not null, file_size integer not null check(file_size between 1 and 5242880), document_type text not null, created_at timestamptz not null default now());
create table public.collection_events(id uuid primary key default gen_random_uuid(), batch_id text not null unique references public.residue_batches(id), collector_id uuid not null references public.profiles(id), record jsonb not null);
create table public.processor_receipts(id uuid primary key default gen_random_uuid(), batch_id text not null unique references public.residue_batches(id), processor_id uuid not null references public.profiles(id), receipt_number text not null, record jsonb not null);
create table public.conflict_findings(id text primary key,batch_id text not null references public.residue_batches(id),record jsonb not null);
create table public.audit_decisions(id uuid primary key default gen_random_uuid(),batch_id text not null references public.residue_batches(id),auditor_id uuid not null references public.profiles(id),record jsonb not null);
create table public.disputes(id uuid primary key default gen_random_uuid(),batch_id text not null references public.residue_batches(id),opened_by uuid not null references public.profiles(id),record jsonb not null);
create table public.ai_extractions(id uuid primary key default gen_random_uuid(),evidence_id uuid not null references public.evidence_assets(id),provider text not null,model_identifier text not null,extracted_fields_json jsonb not null,confirmed_fields_json jsonb,created_at timestamptz default now());
create table public.proof_anchors(id uuid primary key default gen_random_uuid(),batch_id text not null references public.residue_batches(id),evidence_root text not null,proof_version integer not null,transaction_hash text,confirmation_status text not null check(confirmation_status in ('PENDING','CONFIRMED','FAILED')),created_at timestamptz default now(),unique(batch_id,evidence_root));
create table public.request_keys(key uuid primary key, actor_id uuid not null, batch_id text not null, created_at timestamptz default now());
create index batch_farmer_idx on public.residue_batches(farmer_id);
create index evidence_hash_idx on public.evidence_assets(sha256_hash);
create index receipt_idx on public.processor_receipts(receipt_number);
create index event_batch_idx on public.audit_events(batch_id);

-- Server APIs authenticate each request, derive actors from Auth, and enforce domain permissions.
-- No browser role can mutate evidence history or select private tables directly.
do $$ declare t text; begin foreach t in array array['profiles','farm_plots','residue_batches','audit_events','evidence_assets','collection_events','processor_receipts','conflict_findings','audit_decisions','disputes','ai_extractions','proof_anchors','request_keys'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant select, insert, update, delete on public.%I to service_role',t); end loop; end $$;
grant select on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using (id=auth.uid());
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','New farmer')); return new; end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.deny_history_change() returns trigger language plpgsql as $$begin raise exception 'Append-only history';end$$;
create trigger immutable_events before update or delete on public.audit_events for each row execute function public.deny_history_change();
create trigger immutable_decisions before update or delete on public.audit_decisions for each row execute function public.deny_history_change();

create function public.commit_batch(p_document jsonb,p_expected_version integer,p_key uuid,p_actor uuid) returns integer language plpgsql security definer set search_path=public as $$
declare existing public.residue_batches; ev jsonb; seq integer; old_count integer; new_version integer;
begin
 perform pg_advisory_xact_lock(hashtext('bioproof-custody'));
 if exists(select 1 from request_keys where key=p_key and actor_id=p_actor and batch_id=p_document->>'id') then return -1;end if;
 select * into existing from residue_batches where id=p_document->>'id' for update;
 if found then
  if existing.version<>p_expected_version then raise exception 'Concurrent modification; reload';end if;
  old_count=jsonb_array_length(existing.document->'events');
  if jsonb_array_length(p_document->'events')<>old_count+1 then raise exception 'Exactly one appended event required';end if;
  for seq in 0..old_count-1 loop if p_document->'events'->seq <> existing.document->'events'->seq then raise exception 'History modification forbidden';end if;end loop;
  if p_document->>'farmerId'<>existing.document->>'farmerId' or p_document->>'plotId'<>existing.document->>'plotId' or p_document->'declared'<>existing.document->'declared' then raise exception 'Original declaration immutable';end if;
  new_version=existing.version+1;
  update residue_batches set document=p_document,status=p_document->>'status',version=new_version where id=existing.id;
 else
  if p_expected_version<>-1 or jsonb_array_length(p_document->'events')<>1 then raise exception 'Invalid creation';end if;
  old_count=0;new_version=0;
  insert into residue_batches(id,farmer_id,plot_id,status,document) values(p_document->>'id',(p_document->>'farmerId')::uuid,(p_document->>'plotId')::uuid,p_document->>'status',p_document);
 end if;
 ev=p_document->'events'->old_count;
 if ev->'actor'->>'id'<>p_actor::text then raise exception 'Actor mismatch';end if;
 insert into audit_events values((ev->>'id')::uuid,p_document->>'id',old_count,ev->>'hash',ev);
 if ev->>'type'='PICKUP' then insert into collection_events(batch_id,collector_id,record) values(p_document->>'id',p_actor,p_document->'pickup');end if;
 if ev->>'type'='INTAKE' then insert into processor_receipts(batch_id,processor_id,receipt_number,record) values(p_document->>'id',p_actor,p_document->'intake'->>'receipt',p_document->'intake');end if;
 if ev->>'type' in ('APPROVE','REJECT') then insert into audit_decisions(batch_id,auditor_id,record) values(p_document->>'id',p_actor,p_document->'decision');end if;
 if ev->>'type'='DISPUTE' then insert into disputes(batch_id,opened_by,record) values(p_document->>'id',p_actor,ev->'payload');end if;
 for ev in select value from jsonb_array_elements(p_document->'findings') loop insert into conflict_findings values(ev->>'id',p_document->>'id',ev) on conflict(id) do update set record=excluded.record;end loop;
 insert into request_keys(key,actor_id,batch_id) values(p_key,p_actor,p_document->>'id');return new_version;
end$$;
revoke all on function public.commit_batch(jsonb,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.commit_batch(jsonb,integer,uuid,uuid) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidence','evidence',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
