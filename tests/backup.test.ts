import { pickNativeBackup } from "../src/data/nativeBackup";
import type { DocumentPickerResult } from "expo-document-picker";
import { readFileSync } from "node:fs";
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

const pickedDocument = (uri: string, size?: number): DocumentPickerResult => ({
  canceled: false,
  assets: [{ uri, name: "datos.json", size, lastModified: 0 }],
});
test("Android importa datos.json desde la URI autorizada sin usar la caché fuera del sandbox", async () => {
  const contentUri =
    "content://com.android.providers.downloads.documents/document/42";
  const cacheUri =
    "file:///data/user/0/host.exp.exponent/cache/DocumentPicker/test.json";
  const text = readFileSync(
    new URL("../examples/qgasto-datos-prueba.json", import.meta.url),
    "utf8",
  );
  const loaded = await pickNativeBackup(
    "android",
    async (options) => {
      // Model the actual DocumentPicker behavior and Expo Go permission boundary:
      // only the content URI granted by the system is readable by this experience.
      return pickedDocument(
        options.copyToCacheDirectory ? cacheUri : contentUri,
      );
    },
    async (uri) => {
      if (uri !== contentUri)
        throw new Error("Missing 'READ' permission for accessing the file.");
      return text;
    },
  );
  assert.deepEqual(loaded, readBackup(text));
  assert.ok(loaded!.accounts.length > 0);
});
test("iOS conserva la copia accesible y cancelar no intenta leer un archivo", async () => {
  const cacheUri = "file:///app/cache/DocumentPicker/datos.json";
  const state = await pickNativeBackup(
    "ios",
    async (options) => {
      assert.equal(options.copyToCacheDirectory, true);
      return pickedDocument(cacheUri);
    },
    async (uri) => {
      assert.equal(uri, cacheUri);
      return makeBackup(initialState);
    },
  );
  assert.deepEqual(state, initialState);
  assert.equal(
    await pickNativeBackup(
      "android",
      async () => ({ canceled: true, assets: null }),
      async () => {
        assert.fail("No debe leer tras cancelar");
      },
    ),
    null,
  );
});
test("importación nativa rechaza tamaño excesivo, JSON inválido y permisos denegados", async () => {
  await assert.rejects(
    pickNativeBackup(
      "android",
      async () => pickedDocument("content://test/large", 10 * 1024 * 1024 + 1),
      async () => {
        assert.fail("No debe leer un archivo que ya excede el límite");
      },
    ),
    /10 MB/,
  );
  await assert.rejects(
    pickNativeBackup(
      "android",
      async () => pickedDocument("content://test/invalid"),
      async () => "{}",
    ),
    /Copia inválida/,
  );
  // Enforce the byte limit even when a provider does not report its size.
  await assert.rejects(
    pickNativeBackup(
      "android",
      async () => pickedDocument("content://test/unknown-size"),
      async () => "x".repeat(10 * 1024 * 1024 + 1),
    ),
    /10 MB/,
  );
  await assert.rejects(
    pickNativeBackup(
      "android",
      async () => pickedDocument("content://test/denied"),
      async () => {
        throw new Error("Missing 'READ' permission for accessing the file.");
      },
    ),
    /vuelve a seleccionarlo desde Archivos/,
  );
});
