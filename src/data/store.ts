import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apply, Command, initialState, State, stateSchema } from '../domain/finance';
export const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
const key = 'qgasto:data:v1';
export function useFinance() {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['finance'], queryFn: async () => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return initialState;
    try { return stateSchema.parse(JSON.parse(raw)); }
    catch { throw new Error('No pudimos leer los datos guardados. No se han sobrescrito. Conserva el almacenamiento y solicita recuperación.'); }
  }});
  const mutation = useMutation({ scope: { id: 'finance-writes' }, mutationFn: async (command: Command) => {
    const state = cache.getQueryData<State>(['finance']);
    if (!state) throw new Error('Espera a que se carguen los datos');
    const next = apply(state, command);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    cache.setQueryData(['finance'], next);
  }});
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending };
}
