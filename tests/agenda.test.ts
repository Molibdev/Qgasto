import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agendaEventSchema,
  AgendaEvent,
  eventsOnDay,
  localDay,
  monthDays,
  shiftDay,
  shiftMonth,
  timelineEvents,
  weekStart,
} from "../src/domain/agenda";
import { apply, initialState } from "../src/domain/finance";
import { makeBackup, readBackup, validateState } from "../src/domain/backup";
import { reconcile } from "../src/domain/sync";

const event: AgendaEvent = {
  id: "meeting",
  title: "Reunión",
  startsAt: "2026-11-02T09:00",
  endsAt: "2026-11-02T10:00",
  location: "Santiago",
  description: "Planificación del mes",
  remindDayBefore: true,
  remindSameDay: false,
};
test("eventos: crear, editar y eliminar conservan las finanzas e identidad", () => {
  const created = apply(initialState, { kind: "event", value: event });
  assert.equal(initialState.events.length, 0);
  assert.deepEqual(created.transactions, initialState.transactions);
  assert.equal(apply(created, { kind: "event", value: event }), created);
  const updated = apply(created, {
    kind: "update-event",
    value: {
      ...event,
      title: "Reprogramado",
      endsAt: "2026-11-02T11:00",
      remindSameDay: true,
    },
  });
  assert.equal(updated.events.length, 1);
  assert.equal(updated.events[0].id, event.id);
  assert.equal(updated.events[0].title, "Reprogramado");
  assert.equal(created.events[0].title, "Reunión");
  assert.equal(
    apply(updated, { kind: "delete-event", id: event.id }).events.length,
    0,
  );
  assert.throws(
    () => apply(initialState, { kind: "update-event", value: event }),
    /no encontrado/,
  );
});
test("validación rechaza títulos vacíos, fechas imposibles, horas inválidas y fin anterior o igual", () => {
  for (const value of [
    { ...event, title: " " },
    { ...event, startsAt: "2026-02-30T09:00" },
    { ...event, startsAt: "2026-11-02T24:00" },
    { ...event, startsAt: "2026-11-02T09:60" },
    { ...event, startsAt: "2026-11-02T9:00" },
    { ...event, endsAt: event.startsAt },
    { ...event, endsAt: "2026-11-01T23:59" },
    { ...event, title: "x".repeat(121) },
  ])
    assert.equal(agendaEventSchema.safeParse(value).success, false);
  assert.equal(
    agendaEventSchema.parse({ ...event, title: "  Reunión  " }).title,
    "Reunión",
  );
  assert.equal(
    agendaEventSchema.safeParse({
      ...event,
      startsAt: "2028-02-29T23:30",
      endsAt: "2028-03-01T00:30",
    }).success,
    true,
  );
});
test("calendario avanza meses sin saltar febrero y empieza las semanas en lunes", () => {
  assert.equal(shiftMonth("2028-01-31", 1), "2028-02-29");
  assert.equal(shiftMonth("2026-03-31", -1), "2026-02-28");
  assert.equal(shiftMonth("2026-12-15", 1), "2027-01-15");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(weekStart("2026-11-01"), "2026-10-26");
  assert.equal(weekStart("2026-11-02"), "2026-11-02");
  const days = monthDays("2026-11-15");
  assert.equal(days.length, 42);
  assert.equal(new Set(days).size, 42);
  assert.equal(days[0], "2026-10-26");
  assert.equal(days[41], "2026-12-06");
});
test("eventos de varios días se muestran en días intersectados y no después de terminar a medianoche", () => {
  const multi = {
    ...event,
    startsAt: "2026-11-01T23:00",
    endsAt: "2026-11-03T00:00",
  };
  assert.equal(eventsOnDay([multi], "2026-11-01").length, 1);
  assert.equal(eventsOnDay([multi], "2026-11-02").length, 1);
  assert.equal(eventsOnDay([multi], "2026-11-03").length, 0);
  assert.equal(eventsOnDay([multi], "2026-10-31").length, 0);
  assert.equal(timelineEvents([multi], "2026-11-02")[0].start, 0);
  assert.equal(timelineEvents([multi], "2026-11-02")[0].end, 1440);
});
test("franjas horarias separan superposiciones y reutilizan columnas cuando quedan libres", () => {
  const items = timelineEvents(
    [
      event,
      {
        ...event,
        id: "second",
        startsAt: "2026-11-02T09:30",
        endsAt: "2026-11-02T10:30",
      },
      {
        ...event,
        id: "third",
        startsAt: "2026-11-02T10:30",
        endsAt: "2026-11-02T11:00",
      },
    ],
    "2026-11-02",
  );
  assert.deepEqual(
    items.map((x) => [x.lane, x.lanes]),
    [
      [0, 2],
      [1, 2],
      [0, 1],
    ],
  );
  assert.deepEqual(timelineEvents([], "2026-11-02"), []);
});
test("hora local conserva fecha del dispositivo y cruces de horario de verano", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Santiago";
    assert.equal(localDay(new Date("2026-11-02T01:00:00Z")), "2026-11-01");
    assert.equal(shiftDay("2026-09-05", 1), "2026-09-06");
    assert.equal(shiftDay("2026-09-06", 1), "2026-09-07");
    assert.equal(weekStart("2026-09-06"), "2026-08-31");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("respaldos antiguos migran agenda vacía y nuevos conservan eventos y recordatorios", () => {
  const { events, ...old } = initialState;
  assert.deepEqual(validateState(old).events, []);
  const backup = JSON.stringify({
    format: "qgasto-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    data: old,
  });
  assert.deepEqual(readBackup(backup).events, []);
  const current = apply(initialState, { kind: "event", value: event });
  assert.deepEqual(readBackup(makeBackup(current)), current);
  assert.throws(
    () => validateState({ ...current, events: [event, event] }),
    /duplicados/,
  );
  assert.throws(() =>
    validateState({
      ...current,
      events: [{ ...event, endsAt: event.startsAt }],
    }),
  );
});
test("sincronización existente sube y descarga los eventos del perfil", async () => {
  const state = apply(initialState, { kind: "event", value: event });
  const local = await reconcile(
    { state, dirty: true, revision: 0 },
    null,
    async (value) => {
      assert.deepEqual(value.events, [event]);
      return 1;
    },
  );
  assert.equal(local.dirty, false);
  const pulled = await reconcile(
    { state: initialState, dirty: false, revision: 0 },
    { state, revision: 1 },
    async () => {
      assert.fail("No debe subir");
    },
  );
  assert.deepEqual(pulled.state.events, [event]);
});
