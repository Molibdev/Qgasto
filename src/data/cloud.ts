import { supabase } from "./auth";
import { validateState, makeBackup, readBackup } from "../domain/backup";
import { State } from "../domain/finance";
export async function pullCloud(userId: string) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const { data, error } = await supabase
    .from("finance_snapshots")
    .select("data,revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { state: validateState(data.data), revision: Number(data.revision) }
    : null;
}
export async function pushCloud(
  userId: string,
  state: State,
  revision: number,
) {
  if (!supabase) throw new Error("Supabase no está configurado");
  const payload = {
    data: validateState(state),
    revision: revision + 1,
    updated_at: new Date().toISOString(),
  };
  const result =
    revision === 0
      ? await supabase
          .from("finance_snapshots")
          .insert({ ...payload, user_id: userId })
          .select("revision")
          .single()
      : await supabase
          .from("finance_snapshots")
          .update(payload)
          .eq("user_id", userId)
          .eq("revision", revision)
          .select("revision")
          .maybeSingle();
  if (result.error || !result.data)
    throw new Error(
      "No se pudo sincronizar: puede haber cambios en otro dispositivo. Descarga una copia local antes de cargar la nube. " +
        (result.error?.message ?? ""),
    );
  return Number(result.data.revision);
}
async function driveRequest(
  token: string,
  url: string,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new Error(
      `Google Drive respondió ${response.status}. Vuelve a conectar Google si expiró la sesión.`,
    );
  return response;
}
export async function uploadDrive(token: string, state: State) {
  const boundary = `qgasto_${Date.now()}`;
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: `Agendapp-${new Date().toISOString()}.json`, mimeType: "application/json", appProperties: { app: "qgasto", format: "backup-v1" } })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${makeBackup(state)}\r\n--${boundary}--`;
  await driveRequest(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}
export async function listDrive(
  token: string,
): Promise<{ id: string; name: string }[]> {
  const q = encodeURIComponent(
    "trashed = false and appProperties has { key='app' and value='qgasto' }",
  );
  const response = await driveRequest(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime%20desc&pageSize=20&fields=files(id,name)`,
  );
  return (await response.json()).files;
}
export async function restoreDrive(token: string, id: string) {
  const response = await driveRequest(
    token,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,
  );
  const size = Number(response.headers.get("content-length"));
  if (size > 10 * 1024 * 1024) throw new Error("El archivo supera 10 MB");
  return readBackup(await response.text());
}
