-- Esquema preparatorio; no conectado todavía al MVP local.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', currency text not null default 'CLP' check(currency='CLP')
);
create table public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 type text not null check(type in ('bank','cash','credit')),
 opening_balance bigint not null default 0 check(abs(opening_balance::numeric)<=1000000000000),
 active boolean not null default true, unique(id,user_id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80), type text not null check(type in ('income','expense')),
 active boolean not null default true, unique(id,user_id), unique(id,user_id,type)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null, category_id uuid not null, type text not null check(type in ('income','expense')),
 amount bigint not null check(amount>0 and amount<=1000000000000), date date not null,
 note text not null default '' check(length(note)<=250), created_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.accounts(id,user_id),
 foreign key(category_id,user_id,type) references public.categories(id,user_id,type)
);
create table public.transfers (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 from_id uuid not null, to_id uuid not null, amount bigint not null check(amount>0 and amount<=1000000000000), date date not null,
 check(from_id<>to_id), foreign key(from_id,user_id) references public.accounts(id,user_id),
 foreign key(to_id,user_id) references public.accounts(id,user_id)
);
create table public.budgets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category_id uuid not null, category_type text not null default 'expense' check(category_type='expense'),
 month date not null check(extract(day from month)=1), amount bigint not null check(amount>0 and amount<=1000000000000),
 unique(user_id,category_id,month), foreign key(category_id,user_id,category_type) references public.categories(id,user_id,type)
);
create table public.savings_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null, name text not null check(length(trim(name)) between 1 and 80),
 target bigint not null check(target>0 and target<=1000000000000), unique(id,user_id),
 foreign key(account_id,user_id) references public.accounts(id,user_id)
);
create table public.goal_contributions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid not null, amount bigint not null check(amount>0 and amount<=1000000000000), date date not null,
 foreign key(goal_id,user_id) references public.savings_goals(id,user_id)
);
create index transactions_user_date on public.transactions(user_id,date desc);
create index transactions_account on public.transactions(account_id,user_id);
create index transactions_category on public.transactions(category_id,user_id,type);
create index transfers_user_date on public.transfers(user_id,date desc);
create index transfers_from on public.transfers(from_id,user_id);
create index transfers_to on public.transfers(to_id,user_id);
create index categories_owner on public.categories(user_id);
create index accounts_owner on public.accounts(user_id);
create index goals_account on public.savings_goals(account_id,user_id);
create index goals_owner on public.savings_goals(user_id);
create index contributions_goal on public.goal_contributions(goal_id,user_id);
create index contributions_owner on public.goal_contributions(user_id);
alter table public.profiles enable row level security;
create policy owner_profile on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
do $$ declare t text; begin
 foreach t in array array['accounts','categories','transactions','transfers','budgets','savings_goals','goal_contributions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
 end loop;
end $$;
create view public.account_balances with (security_invoker=true) as
 select a.id,a.user_id,a.name,a.type,a.opening_balance
 + coalesce((select sum(case when t.type='income' then t.amount else -t.amount end) from public.transactions t where t.account_id=a.id and t.user_id=a.user_id),0)
 + coalesce((select sum(case when t.to_id=a.id then t.amount else -t.amount end) from public.transfers t where (t.from_id=a.id or t.to_id=a.id) and t.user_id=a.user_id),0) as balance
 from public.accounts a;
-- Desactivación en lugar de borrado; futuras RPC definirán edición y auditoría.
revoke delete on public.accounts,public.categories from authenticated;
commit;
