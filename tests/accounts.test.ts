import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  initialState,
  bankTotal,
  creditSummary,
  accountSchema,
  monthLabel,
  State,
  Account,
} from "../src/domain/finance";
import { readBackup, makeBackup } from "../src/domain/backup";
const accounts: Account[] = [
  {
    id: "bank",
    name: "Corriente",
    type: "bank",
    openingBalance: 500000,
    active: true,
    bank: "Santander",
    bankType: "checking",
    maintenanceFee: 3500,
  },
  {
    id: "cash",
    name: "Billetera",
    type: "cash",
    openingBalance: 50000,
    active: true,
  },
  {
    id: "card",
    name: "CMR",
    type: "credit",
    openingBalance: -100000,
    active: true,
    bank: "Banco Falabella",
    creditLimit: 1000000,
    billingDay: 31,
  },
];
const state: State = { ...initialState, accounts };
test("patrimonio suma solo bancos, excluye efectivo y tarjetas", () => {
  assert.equal(bankTotal(state), 500000);
  const s = apply(state, {
    kind: "transaction",
    value: {
      id: "c",
      accountId: "card",
      categoryId: "food",
      type: "expense",
      amount: 200000,
      date: "2026-11-01",
      note: "",
    },
  });
  assert.equal(bankTotal(s), 500000);
  assert.deepEqual(creditSummary(s, accounts[2]), {
    debt: 300000,
    limit: 1000000,
    available: 700000,
  });
});
test("cupo disponible no es patrimonio, no es negativo ni crece por sobrepago", () => {
  assert.equal(
    creditSummary(
      { ...state, accounts: [{ ...accounts[2], openingBalance: -2000000 }] },
      accounts[2],
    ).available,
    0,
  );
  assert.equal(
    creditSummary(
      { ...state, accounts: [{ ...accounts[2], openingBalance: 5000 }] },
      accounts[2],
    ).available,
    1000000,
  );
  assert.equal(
    creditSummary(state, { ...accounts[2], creditLimit: undefined }).available,
    null,
  );
});
test("fechas de facturación y montos inválidos se rechazan", () => {
  for (const billingDay of [0, 32, 1.5])
    assert.equal(
      accountSchema.safeParse({ ...accounts[2], billingDay }).success,
      false,
    );
  assert.equal(
    accountSchema.safeParse({ ...accounts[0], maintenanceFee: -1 }).success,
    false,
  );
  assert.equal(
    accountSchema.safeParse({ ...accounts[2], creditLimit: -1 }).success,
    false,
  );
});
test("edición de metadatos preserva saldos y rechaza convertir cuenta histórica", () => {
  const s = apply(state, {
    kind: "update-account",
    value: { ...accounts[0], bankType: "sight", maintenanceFee: 0 },
  });
  assert.equal(bankTotal(s), 500000);
  assert.equal(s.transactions.length, 0);
  assert.throws(() =>
    apply(s, {
      kind: "update-account",
      value: { ...accounts[0], openingBalance: 1 },
    }),
  );
  assert.throws(() =>
    apply(s, {
      kind: "update-account",
      value: { ...accounts[0], type: "credit" },
    }),
  );
});
test("backup conserva metadatos y acepta cuentas antiguas sin inventar cupos", () => {
  assert.deepEqual(readBackup(makeBackup(state)), state);
  const legacy: Account = {
    id: "old",
    name: "Antigua",
    type: "credit",
    openingBalance: -100,
    active: true,
  };
  assert.equal(
    readBackup(makeBackup({ ...initialState, accounts: [legacy] })).accounts[0]
      .creditLimit,
    undefined,
  );
  assert.equal(monthLabel("2026-11"), "noviembre");
  assert.equal(monthLabel("2026-01"), "enero");
  assert.equal(monthLabel("2026-13"), "mes seleccionado");
});
