import type {
  DocumentPickerOptions,
  DocumentPickerResult,
} from "expo-document-picker";
import { MAX_BACKUP_BYTES, readBackup } from "../domain/backup";

/** Native adapter kept independent of Expo runtime for regression tests. */
export async function pickNativeBackup(
  platform: string,
  pickDocument: (
    options: DocumentPickerOptions,
  ) => Promise<DocumentPickerResult>,
  readText: (uri: string) => Promise<string>,
) {
  const result = await pickDocument({
    // Providers may omit or mislabel the MIME type. Validate the JSON itself.
    type: "*/*",
    multiple: false,
    // Android grants read access to the selected content:// URI. DocumentPicker
    // copies into context.cacheDir, which can be outside the experience's scoped
    // FileSystem permissions in Expo Go. Read the granted URI immediately instead.
    // iOS keeps its existing cached-copy flow for security-scoped documents.
    copyToCacheDirectory: platform !== "android",
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset)
    throw new Error("No se recibió el archivo. Vuelve a seleccionarlo.");
  if (asset.size && asset.size > MAX_BACKUP_BYTES)
    throw new Error("La copia supera 10 MB");
  let text: string;
  try {
    text = await readText(asset.uri);
  } catch (error) {
    if (error instanceof Error && /permission|permiso/i.test(error.message)) {
      throw new Error(
        "No se pudo obtener permiso para leer la copia. Descarga el JSON al teléfono y vuelve a seleccionarlo desde Archivos.",
      );
    }
    throw error;
  }
  return readBackup(text);
}
