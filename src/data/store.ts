import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  apply,
  Command,
  initialState,
  State,
  processRecurring,
  today,
} from "../domain/finance";
import { reconcile } from "../domain/sync";
import { AppState } from "react-native";
import { validateState } from "../domain/backup";
import { useAuth } from "./auth";
import { pullCloud, pushCloud } from "./cloud";
import { useEffect, useState } from "react";
export const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
type Local = { state: State; revision: number; dirty: boolean };
export function useFinance() {
  const { session, loading } = useAuth(),
    owner = session?.user.id ?? "guest",
    cache = useQueryClient();
  const queryKey = ["finance", owner],
    key = owner === "guest" ? "qgasto:data:v1" : `qgasto:data:${owner}`;
  const [syncMessage, setSyncMessage] = useState("");
  const query = useQuery({
    queryKey,
    enabled: !loading,
    queryFn: async (): Promise<Local> => {
      const raw = await AsyncStorage.getItem(key);
      let local: Local;
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        local = parsed?.state
          ? {
              state: validateState(parsed.state),
              revision: parsed.revision ?? 0,
              dirty: !!parsed.dirty,
            }
          : {
              state: parsed ? validateState(parsed) : initialState,
              revision: 0,
              dirty: !!parsed,
            };
      } catch {
        throw new Error(
          "No se pueden leer los datos locales. No se han sobrescrito.",
        );
      }
      const state = processRecurring(local.state, today());
      if (JSON.stringify(state) !== JSON.stringify(local.state)) {
        local = { ...local, state, dirty: true };
        await AsyncStorage.setItem(key, JSON.stringify(local));
      }
      return local;
    },
  });
  const mutation = useMutation({
    scope: { id: `finance:${owner}` },
    mutationFn: async (
      action:
        | { command: Command }
        | { restore: State }
        | { sync: true }
        | { pull: true },
    ) => {
      const local = cache.getQueryData<Local>(queryKey);
      if (!local) throw new Error("Espera a que se carguen los datos");
      let next = local;
      if ("command" in action) {
        const state = apply(local.state, action.command);
        if (JSON.stringify(state) === JSON.stringify(local.state)) return;
        next = { ...local, state, dirty: true };
      }
      if ("restore" in action)
        next = { ...local, state: validateState(action.restore), dirty: true };
      if ("pull" in action) {
        const remote = await pullCloud(owner);
        if (!remote) throw new Error("No hay datos en la nube");
        next = { ...remote, dirty: false };
      }
      if ("sync" in action) {
        if (!session) throw new Error("Inicia sesión para sincronizar");
        const remote = await pullCloud(owner);
        next = await reconcile(local, remote, (state, revision) =>
          pushCloud(owner, state, revision),
        );
      }
      if (JSON.stringify(next) === JSON.stringify(local)) return;
      await AsyncStorage.setItem(key, JSON.stringify(next));
      cache.setQueryData(queryKey, next);
    },
  });
  const revision = query.data?.revision,
    dirty = query.data?.dirty;
  useEffect(() => {
    if (!session || !query.data) return;
    const timer = setTimeout(() => {
      void mutation
        .mutateAsync({ sync: true })
        .then(() => setSyncMessage("Sincronizado"))
        .catch((e) => setSyncMessage(e.message));
    }, 2000);
    return () => clearTimeout(timer);
  }, [owner, revision, dirty, query.dataUpdatedAt]);
  // Recalcular al volver al primer plano y periódicamente con la app abierta.
  useEffect(() => {
    const process = () => {
      if (cache.getQueryData(queryKey))
        void mutation
          .mutateAsync({
            command: { kind: "process-recurring", date: today() },
          })
          .catch(() => {});
    };
    const timer = setInterval(process, 60000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        process();
        if (session)
          void mutation
            .mutateAsync({ sync: true })
            .catch((e) => setSyncMessage(e.message));
      }
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [owner]);
  return {
    ...query,
    data: query.data?.state,
    save: (command: Command) => mutation.mutateAsync({ command }),
    restore: (state: State) => mutation.mutateAsync({ restore: state }),
    sync: () => mutation.mutateAsync({ sync: true }),
    pull: () => mutation.mutateAsync({ pull: true }),
    saving: mutation.isPending,
    syncMessage,
  };
}
