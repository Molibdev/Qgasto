import { z } from 'zod';

export const amountSchema = z.number().int().positive().max(1_000_000_000_000);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}, 'Fecha inválida');
const name = z.string().trim().min(1).max(80);
export const accountSchema = z.object({ id: z.string(), name, type: z.enum(['bank', 'cash', 'credit']), openingBalance: z.number().int().min(-1e12).max(1e12), active: z.boolean() });
export const transactionSchema = z.object({ id: z.string(), type: z.enum(['income', 'expense']), accountId: z.string(), categoryId: z.string(), amount: amountSchema, date: dateSchema, note: z.string().max(250) });
export const transferSchema = z.object({ id: z.string(), fromId: z.string(), toId: z.string(), amount: amountSchema, date: dateSchema }).refine(t => t.fromId !== t.toId, 'Elige dos cuentas distintas');
const categorySchema = z.object({ id: z.string(), name, type: z.enum(['income', 'expense']) });
export const budgetSchema = z.object({ id: z.string(), categoryId: z.string(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), amount: amountSchema });
export const goalSchema = z.object({ id: z.string(), name, target: amountSchema, accountId: z.string() });
export const contributionSchema = z.object({ id: z.string(), goalId: z.string(), amount: amountSchema, date: dateSchema });
export const stateSchema = z.object({ version: z.literal(1), accounts: z.array(accountSchema), categories: z.array(categorySchema), transactions: z.array(transactionSchema), transfers: z.array(transferSchema), budgets: z.array(budgetSchema), goals: z.array(goalSchema), contributions: z.array(contributionSchema) });
export type State = z.infer<typeof stateSchema>;
export type Account = State['accounts'][number];
export type Transaction = State['transactions'][number];
export type Command = { kind: 'account'; value: Account } | { kind: 'transaction'; value: Transaction } | { kind: 'transfer'; value: State['transfers'][number] } | { kind: 'budget'; value: State['budgets'][number] } | { kind: 'goal'; value: State['goals'][number] } | { kind: 'contribution'; value: State['contributions'][number] };
export const initialState: State = { version: 1, accounts: [], transactions: [], transfers: [], budgets: [], goals: [], contributions: [], categories: [
  { id: 'salary', name: 'Sueldo', type: 'income' }, { id: 'other-income', name: 'Otros ingresos', type: 'income' },
  { id: 'food', name: 'Alimentación', type: 'expense' }, { id: 'home', name: 'Hogar', type: 'expense' }, { id: 'transport', name: 'Transporte', type: 'expense' }, { id: 'health', name: 'Salud', type: 'expense' }, { id: 'leisure', name: 'Ocio', type: 'expense' }, { id: 'other', name: 'Otros gastos', type: 'expense' },
] };
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const clp = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export function balance(s: State, id: string): number {
  return (s.accounts.find(a => a.id === id)?.openingBalance ?? 0)
    + s.transactions.filter(t => t.accountId === id).reduce((v,t) => v + (t.type === 'income' ? t.amount : -t.amount), 0)
    + s.transfers.reduce((v,t) => v + (t.toId === id ? t.amount : 0) - (t.fromId === id ? t.amount : 0), 0);
}
export function monthly(s: State, month: string) {
  return s.transactions.filter(t => t.date.startsWith(month)).reduce((v,t) => ({ income: v.income + (t.type === 'income' ? t.amount : 0), expense: v.expense + (t.type === 'expense' ? t.amount : 0) }), { income: 0, expense: 0 });
}
export const spent = (s: State, categoryId: string, month: string) => s.transactions.filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(month)).reduce((v,t) => v+t.amount,0);
export const contributed = (s: State, goalId: string) => s.contributions.filter(c => c.goalId === goalId).reduce((v,c) => v+c.amount,0);
export function possibleDuplicate(s: State, t: Transaction) { return s.transactions.some(x => x.accountId === t.accountId && x.amount === t.amount && x.date === t.date && x.type === t.type && x.categoryId === t.categoryId); }
export function apply(s: State, c: Command): State {
  const account = (id: string) => { const a = s.accounts.find(a => a.id === id && a.active); if (!a) throw new Error('Selecciona una cuenta activa'); return a; };
  const append = <K extends 'accounts'|'transactions'|'transfers'|'budgets'|'goals'|'contributions'>(key: K, value: State[K][number]): State => {
    if (s[key].some(x => x.id === value.id)) return s;
    return { ...s, [key]: [...s[key], value] };
  };
  switch(c.kind) {
    case 'account': { const a = accountSchema.parse(c.value); return append('accounts',a); }
    case 'transaction': { const t = transactionSchema.parse(c.value); account(t.accountId); if (!s.categories.some(x => x.id === t.categoryId && x.type === t.type)) throw new Error('Categoría incompatible'); return append('transactions',t); }
    case 'transfer': { const t = transferSchema.parse(c.value); account(t.fromId); account(t.toId); return append('transfers',t); }
    case 'budget': { const b = budgetSchema.parse(c.value); if (!s.categories.some(x => x.id === b.categoryId && x.type === 'expense')) throw new Error('Selecciona una categoría de gasto'); return { ...s, budgets: [...s.budgets.filter(x => x.categoryId !== b.categoryId || x.month !== b.month), b] }; }
    case 'goal': { const g = goalSchema.parse(c.value); if (account(g.accountId).type === 'credit') throw new Error('Una meta necesita una cuenta de efectivo o bancaria'); return append('goals',g); }
    case 'contribution': { const v = contributionSchema.parse(c.value); if (s.contributions.some(x => x.id === v.id)) return s; const g = s.goals.find(x => x.id === v.goalId); if (!g) throw new Error('Selecciona una meta'); account(g.accountId); const reserved = s.goals.filter(x => x.accountId === g.accountId).reduce((n,x) => n+contributed(s,x.id),0); if (v.amount > balance(s,g.accountId)-reserved) throw new Error('Saldo sin asignar insuficiente en la cuenta de ahorro'); if (contributed(s,g.id)+v.amount > g.target) throw new Error('El aporte supera lo pendiente de la meta'); return append('contributions',v); }
  }
}
