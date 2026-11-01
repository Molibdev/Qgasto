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
export async function pickBackup(): Promise<State | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "application/octet-stream"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_BACKUP_BYTES)
    throw new Error("La copia supera 10 MB");
  const text =
    Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await new File(asset.uri).text();
  return readBackup(text);
}
