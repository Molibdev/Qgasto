import { State } from "./finance";
export type LocalSnapshot = { state: State; revision: number; dirty: boolean };
export type RemoteSnapshot = { state: State; revision: number };
export async function reconcile(
  local: LocalSnapshot,
  remote: RemoteSnapshot | null,
  upload: (s: State, revision: number) => Promise<number>,
): Promise<LocalSnapshot> {
  if (remote && remote.revision !== local.revision) {
    if (local.dirty)
      throw new Error(
        "Conflicto: hay cambios locales y remotos. Guarda una copia y elige Cargar nube para reemplazar el dispositivo.",
      );
    return { ...remote, dirty: false };
  }
  if (!remote && local.revision !== 0)
    throw new Error(
      "La copia remota ya no existe. Conserva un JSON local antes de recuperar la nube.",
    );
  if (local.dirty)
    return {
      ...local,
      revision: await upload(local.state, local.revision),
      dirty: false,
    };
  return local;
}
