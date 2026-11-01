-- Metadatos opcionales para compatibilidad con cuentas existentes.
-- El cliente actual persiste estos datos en finance_snapshots.
begin;
alter table public.accounts
 add column bank text check(length(bank)<=80),
 add column bank_type text check(bank_type in ('checking','sight')),
 add column maintenance_fee bigint check(maintenance_fee>=0 and maintenance_fee<=1000000000000),
 add column credit_limit bigint check(credit_limit>=0 and credit_limit<=1000000000000),
 add column billing_day smallint check(billing_day between 1 and 31);
commit;
