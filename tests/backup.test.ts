import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, apply } from "../src/domain/finance";
import { makeBackup, readBackup, validateState } from "../src/domain/backup";
test("JSON conserva exactamente todo el estado y no incluye sesiones", () => {
  let s = apply(initialState, {
    kind: "account",
    value: {
      id: "bank",
      name: "Banco",
      type: "bank",
      openingBalance: 1000,
      active: true,
    },
  });
  s = apply(s, {
    kind: "recurring",
    value: {
      id: "r",
      type: "expense",
      accountId: "bank",
      categoryId: "food",
      amount: 100,
      startDate: "2027-01-01",
      nextDate: "2027-01-01",
      active: true,
      note: "Compra",
    },
  });
  assert.deepEqual(readBackup(makeBackup(s)), s);
  assert.equal(makeBackup(s).includes("access_token"), false);
});
test("JSON rechaza versión futura, sintaxis, tamaño, IDs duplicados y referencias inválidas", () => {
  assert.throws(() => readBackup("{}"));
  assert.throws(() =>
    readBackup(
      makeBackup(initialState).replace('"version": 1', '"version": 2'),
    ),
  );
  assert.throws(() => readBackup("x".repeat(10 * 1024 * 1024 + 1)));
  assert.throws(() =>
    validateState({
      ...initialState,
      categories: [initialState.categories[0], initialState.categories[0]],
    }),
  );
  assert.throws(() =>
    validateState({
      ...initialState,
      goals: [{ id: "g", name: "Meta", target: 10, accountId: "missing" }],
    }),
  );
});
test("datos anteriores sin recurrentes migran sin perder transferencias históricas", () => {
  const { recurring, ...legacy } = initialState;
  assert.deepEqual(validateState(legacy).recurring, []);
});
