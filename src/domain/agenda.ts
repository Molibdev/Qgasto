import { z } from "zod";
import { dateSchema } from "./dates";

// Floating local time, like the phone calendar: do not append Z or convert to UTC.
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
  .refine(
    (v) => dateSchema.safeParse(v.slice(0, 10)).success,
    "Fecha inválida",
  );
export const agendaEventSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(120),
    startsAt: localDateTime,
    endsAt: localDateTime,
    location: z.string().trim().max(200),
    description: z.string().trim().max(2000),
    remindDayBefore: z.boolean(),
    remindSameDay: z.boolean(),
  })
  .refine((e) => e.endsAt > e.startsAt, "El fin debe ser posterior al inicio");
export type AgendaEvent = z.infer<typeof agendaEventSchema>;
export type AgendaView = "month" | "week" | "day";
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDay(day: string, count: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + count);
  return localDay(d);
}
export function shiftMonth(day: string, count: number): string {
  const d = new Date(`${day}T12:00:00`),
    original = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + count);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(original, last));
  return localDay(d);
}
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  return shiftDay(day, -((weekday + 6) % 7));
}
export function monthDays(day: string): string[] {
  const start = weekStart(`${day.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, i) => shiftDay(start, i));
}
export function eventsOnDay(events: AgendaEvent[], day: string): AgendaEvent[] {
  const start = `${day}T00:00`,
    end = `${shiftDay(day, 1)}T00:00`;
  return events
    .filter((e) => e.startsAt < end && e.endsAt > start)
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
}
// Place simultaneous events side by side, including clipped multi-day events.
export function timelineEvents(events: AgendaEvent[], day: string) {
  const minutes = (v: string) =>
    Number(v.slice(11, 13)) * 60 + Number(v.slice(14, 16));
  const items = eventsOnDay(events, day).map((event) => {
    const start =
      event.startsAt.slice(0, 10) < day ? 0 : minutes(event.startsAt);
    const end = event.endsAt.slice(0, 10) > day ? 1440 : minutes(event.endsAt);
    return {
      event,
      start,
      end,
      visualEnd: Math.min(1440, Math.max(end, start + 30)),
      lane: 0,
      lanes: 1,
    };
  });
  let group: typeof items = [],
    groupEnd = -1;
  const finish = () => {
    const count = Math.max(1, ...group.map((x) => x.lane + 1));
    group.forEach((x) => {
      x.lanes = count;
    });
    group = [];
  };
  for (const item of items) {
    if (item.start >= groupEnd) finish();
    const active = group.filter((x) => x.visualEnd > item.start);
    while (active.some((x) => x.lane === item.lane)) item.lane++;
    group.push(item);
    groupEnd = Math.max(...group.map((x) => x.visualEnd));
  }
  finish();
  return items;
}
