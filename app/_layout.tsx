import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { client } from '../src/data/store';
export default function Layout() {
  return <SafeAreaProvider><QueryClientProvider client={client}><Stack screenOptions={{headerShown:false}} /></QueryClientProvider></SafeAreaProvider>;
}
