import React, { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
const base = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5ef" },
  shell: { flex: 1, width: "100%", maxWidth: 1040, alignSelf: "center" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: "#234c3b",
  },
  localBadge: { backgroundColor: "#e5eddf", padding: 10, borderRadius: 20 },
  muted: { fontSize: 13, color: "#718078", lineHeight: 18 },
  content: { paddingHorizontal: 24, paddingBottom: 30, gap: 20 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "700",
    color: "#718078",
    textTransform: "uppercase",
  },
  month: {
    color: "#365d4b",
    backgroundColor: "#e9ede3",
    borderRadius: 10,
    padding: 10,
    width: 100,
    textAlign: "center",
    fontSize: 13,
  },
  hero: { backgroundColor: "#225741", borderRadius: 28, padding: 26, gap: 8 },
  heroLabel: { color: "#c3d8ca", fontSize: 12 },
  heroAmount: {
    color: "#fff9e9",
    fontSize: 42,
    fontWeight: "600",
    letterSpacing: -1.5,
  },
  heroCaption: { color: "#c0d2c4", fontSize: 12, lineHeight: 18 },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#47745e",
    marginTop: 16,
    paddingTop: 20,
    gap: 14,
  },
  heroSmall: {
    color: "#f3f5e6",
    fontSize: 21,
    marginTop: 8,
    fontWeight: "600",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    backgroundColor: "#285f48",
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: "#e6eddf" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  section: {
    fontSize: 21,
    color: "#283f33",
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: "#fffdf7",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e6e9dd",
    padding: 20,
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#2c4438" },
  body: { fontSize: 14, color: "#65756b", lineHeight: 22 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: {
    height: 7,
    backgroundColor: "#e9ede3",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: { height: 7, backgroundColor: "#67a78a", borderRadius: 8 },
  empty: {
    color: "#7b867b",
    paddingVertical: 15,
    fontSize: 14,
    lineHeight: 22,
  },
  activity: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e4e8dd",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { fontSize: 13, color: "#28654b", fontWeight: "600" },
  accountAmount: { fontSize: 28, color: "#244f3b", fontWeight: "600" },
  nav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#e2e7da",
    backgroundColor: "#fafbf5",
    paddingVertical: 13,
  },
  navItem: { flex: 1, alignItems: "center", gap: 5 },
  footer: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#97a18f",
    textAlign: "center",
    marginTop: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,40,28,0.4)",
  },
  sheet: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: "#fafbf5",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  label: { fontSize: 13, color: "#466451", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cad5c5",
    padding: 13,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#243c2e",
  },
  chip: {
    borderWidth: 1,
    borderColor: "#cdd8c6",
    borderRadius: 12,
    padding: 11,
  },
  chipSelected: { backgroundColor: "#2c634a", borderColor: "#2c634a" },
  error: { color: "#a33d2f", fontSize: 14, lineHeight: 21 },
});
const darkColors: Record<string, string> = {
  "#f5f5ef": "#0c1220",
  "#fffdf7": "#172132",
  "#fafbf5": "#101a2b",
  "#e6e9dd": "#29374a",
  "#e2e7da": "#29374a",
  "#e4e8dd": "#29374a",
  "#234c3b": "#edf6ff",
  "#283f33": "#edf6ff",
  "#2c4438": "#edf6ff",
  "#244f3b": "#a5c5ff",
  "#243c2e": "#eef4ff",
  "#718078": "#a9b9ce",
  "#65756b": "#b4c3d4",
  "#7b867b": "#acbbcf",
  "#466451": "#c2cfe2",
  "#cdd8c6": "#35465e",
  "#cad5c5": "#35465e",
  "#fff": "#edf4ff",
  "#e9ede3": "#26364c",
  "#e6eddf": "#263a53",
  "#e5eddf": "#253a53",
  "#365d4b": "#c5dcff",
  "#28654b": "#a6caff",
  "#97a18f": "#97a9bf",
  "#285f48": "#315fd1",
  "#225741": "#183e86",
  "#67a78a": "#83acff",
  "#2c634a": "#315fd1",
  "#20634c": "#8bb2ff",
  "#a33d2f": "#ffada3",
};
const lightColors: Record<string, string> = {
  "#f5f5ef": "#f3f6fc",
  "#fffdf7": "#ffffff",
  "#fafbf5": "#ffffff",
  "#225741": "#203b80",
  "#285f48": "#315fd1",
  "#2c634a": "#315fd1",
  "#234c3b": "#193258",
  "#283f33": "#172947",
  "#2c4438": "#223653",
  "#244f3b": "#244685",
  "#e6eddf": "#e7eefb",
  "#e9ede3": "#e5ecf8",
  "#e5eddf": "#e7eefb",
  "#67a78a": "#749bea",
  "#28654b": "#315fd1",
  "#365d4b": "#244685",
  "#718078": "#627591",
  "#c3d8ca": "#cfddff",
  "#c0d2c4": "#c5d4f4",
  "#47745e": "#49639b",
};
function build(dark: boolean) {
  const remap = (v: any): any =>
    typeof v === "string"
      ? dark
        ? (darkColors[v] ?? v)
        : (lightColors[v] ?? v)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x)]))
        : v;
  return StyleSheet.create(remap(base)) as typeof base;
}
const ThemeContext = createContext({
  styles: build(false),
  dark: false,
  toggle: () => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(),
    [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem("qgasto:theme").then(setChoice);
  }, []);
  const dark = choice ? choice === "dark" : system === "dark";
  return (
    <ThemeContext.Provider
      value={{
        styles: build(dark),
        dark,
        toggle: () => {
          const v = dark ? "light" : "dark";
          setChoice(v);
          void AsyncStorage.setItem("qgasto:theme", v);
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
