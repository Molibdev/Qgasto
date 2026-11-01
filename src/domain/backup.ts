import { z } from "zod";
import { State, stateSchema } from "./finance";
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const envelope = z.object({
  format: z.literal("qgasto-backup"),
  version: z.literal(1),
  createdAt: z.string().datetime(),
  data: stateSchema,
});
export function validateState(input: unknown): State {
  const s = stateSchema.parse(input);
  for (const list of [
    s.accounts,
    s.categories,
    s.transactions,
    s.transfers,
    s.budgets,
    s.goals,
    s.contributions,
    s.recurring,
  ]) {
    const ids = list.map((x) => x.id);
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      throw new Error("IDs vacíos o duplicados");
  }
  const account = (id: string) => s.accounts.some((a) => a.id === id);
  const category = (id: string, type: string) =>
    s.categories.some((c) => c.id === id && c.type === type);
  for (const t of [...s.transactions, ...s.recurring])
    if (!account(t.accountId) || !category(t.categoryId, t.type))
      throw new Error("Movimiento con referencias inválidas");
  for (const t of s.transfers)
    if (!account(t.fromId) || !account(t.toId))
      throw new Error("Transferencia histórica inválida");
  for (const b of s.budgets)
    if (!category(b.categoryId, "expense"))
      throw new Error("Presupuesto inválido");
  if (
    new Set(s.budgets.map((b) => `${b.month}:${b.categoryId}`)).size !==
    s.budgets.length
  )
    throw new Error("Presupuestos duplicados");
  for (const g of s.goals)
    if (!account(g.accountId)) throw new Error("Meta sin cuenta");
  for (const c of s.contributions)
    if (!s.goals.some((g) => g.id === c.goalId))
      throw new Error("Aporte sin meta");
  for (const r of s.recurring)
    if (r.nextDate < r.startDate) throw new Error("Fecha recurrente inválida");
  return s;
}
export function makeBackup(s: State): string {
  const text = JSON.stringify(
    {
      format: "qgasto-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      data: validateState(s),
    },
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("La copia supera el límite de 10 MB");
  return text;
}
export function readBackup(text: string): State {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("La copia supera el límite de 10 MB");
  try {
    return validateState(
      envelope.parse(JSON.parse(text.replace(/^\uFEFF/, ""))).data,
    );
  } catch (e) {
    throw new Error(
      `Copia inválida o incompatible. No se modificaron tus datos. ${e instanceof Error && e.name !== "ZodError" ? e.message : ""}`,
    );
  }
}
