import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { State } from "../domain/finance";
import { makeBackup, readBackup, MAX_BACKUP_BYTES } from "../domain/backup";
export async function downloadBackup(s: State) {
  const text = makeBackup(s),
    name = `Qgasto-respaldo-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("No está disponible compartir archivos");
  const file = new File(Paths.cache, name);
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
  });
}
// Keep the browser's file dialog directly in the user gesture. Some mobile
// browsers do not open dialogs triggered by synthetic dispatched MouseEvents.
function pickWebFile(): Promise<globalThis.File | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    // No MIME filter: mobile providers may return JSON with an empty/wrong type.
    input.style.display = "none";
    const finish = (file: globalThis.File | null) => {
      input.remove();
      resolve(file);
    };
    input.addEventListener("change", () => finish(input.files?.[0] ?? null), {
      once: true,
    });
    input.addEventListener("cancel", () => finish(null), { once: true });
    document.body.appendChild(input);
    try {
      input.click();
    } catch (error) {
      input.remove();
      reject(error);
    }
  });
}
export async function pickBackup(): Promise<State | null> {
  let text: string;
  if (Platform.OS === "web") {
    const file = await pickWebFile();
    if (!file) return null;
    if (file.size > MAX_BACKUP_BYTES) throw new Error("La copia supera 10 MB");
    text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () =>
        reject(new Error("No se pudo leer el archivo seleccionado"));
      reader.onabort = () => reject(new Error("Lectura cancelada"));
      reader.readAsText(file);
    });
  } else {
    const result = await DocumentPicker.getDocumentAsync({
      // Native providers can label JSON as text or omit its MIME type.
      // The backup schema below is the authority, not the provider's MIME label.
      type: "*/*",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset)
      throw new Error("No se recibió el archivo. Vuelve a seleccionarlo.");
    if (asset.size && asset.size > MAX_BACKUP_BYTES)
      throw new Error("La copia supera 10 MB");
    text = await new File(asset.uri).text();
  }
  return readBackup(text);
}
