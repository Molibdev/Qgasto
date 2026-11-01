import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcile, LocalSnapshot } from "../src/domain/sync";
import { initialState } from "../src/domain/finance";
const local: LocalSnapshot = { state: initialState, revision: 0, dirty: true };
test("sincroniza primera escritura conservando caché y revisión", async () => {
  const next = await reconcile(local, null, async (s, r) => {
    assert.equal(s, local.state);
    assert.equal(r, 0);
    return 1;
  });
  assert.equal(next.revision, 1);
  assert.equal(next.dirty, false);
  assert.equal(local.dirty, true);
});
test("conflicto entre dispositivos no sube ni modifica datos locales", async () => {
  let uploaded = false;
  await assert.rejects(
    () =>
      reconcile(local, { state: initialState, revision: 2 }, async () => {
        uploaded = true;
        return 3;
      }),
    /Conflicto/,
  );
  assert.equal(uploaded, false);
  assert.equal(local.revision, 0);
});
test("dispositivo sin cambios carga nube y no sobrescribe servidor", async () => {
  const next = await reconcile(
    { ...local, dirty: false },
    { state: initialState, revision: 4 },
    async () => {
      throw Error("No debería subir");
    },
  );
  assert.equal(next.revision, 4);
  assert.equal(next.dirty, false);
});
test("error de red conserva datos pendientes y detecta desaparición remota", async () => {
  await assert.rejects(
    () =>
      reconcile(local, null, async () => {
        throw Error("offline");
      }),
    /offline/,
  );
  assert.equal(local.dirty, true);
  await assert.rejects(
    () => reconcile({ ...local, revision: 5 }, null, async () => 6),
    /ya no existe/,
  );
});
