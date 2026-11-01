-- Sincronización de instantáneas completas con control de revisión optimista.
begin;
create table public.finance_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and data ? 'version' and data->>'version'='1' and octet_length(data::text)<=10485760),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.finance_snapshots enable row level security;
create policy owner_snapshots on public.finance_snapshots for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.finance_snapshots to authenticated;
revoke all on public.finance_snapshots from anon;
create function public.check_snapshot_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' and NEW.revision<>1 then raise exception 'initial revision must be 1'; end if;
 if TG_OP='UPDATE' and NEW.revision<>OLD.revision+1 then raise exception 'revision conflict'; end if;
 return NEW;
end $$;
create trigger snapshot_revision before insert or update on public.finance_snapshots for each row execute function public.check_snapshot_revision();
commit;
