import React, { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, useColorScheme, Platform } from "react-native";
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
    flexWrap: "wrap",
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
// Paleta y tipografía centralizadas; los inputs tienen colores propios para evitar
// que una sustitución global del blanco deje texto claro sobre fondo claro.
const colors = (dark: boolean) =>
  dark
    ? {
        bg: "#17161d",
        surface: "#24222c",
        text: "#f6f2ff",
        muted: "#bcb5ca",
        border: "#766783",
        soft: "#383142",
        accent: "#b6a1eb",
        hero: "#c5b3ef",
        heroText: "#2b203f",
        input: "#302b3b",
      }
    : {
        bg: "#f8f6fc",
        surface: "#ffffff",
        text: "#30263e",
        muted: "#655773",
        border: "#b6a8c7",
        soft: "#eee7f8",
        accent: "#77609f",
        hero: "#e3d6f8",
        heroText: "#39234f",
        input: "#f4eff9",
      };
function build(dark: boolean) {
  const c = colors(dark);
  const font = Platform.select({
    ios: "Avenir Next",
    android: "sans-serif",
    default: "ui-rounded, system-ui, sans-serif",
  });
  const result = Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      {
        ...value,
        ...("fontSize" in value ? { fontFamily: font } : {}),
        ...("color" in value ? { color: c.text } : {}),
        ...("borderColor" in value ? { borderColor: c.border } : {}),
        ...("backgroundColor" in value ? { backgroundColor: c.surface } : {}),
      },
    ]),
  ) as typeof base;
  return StyleSheet.create({
    ...result,
    safe: { ...result.safe, backgroundColor: c.bg },
    center: { ...result.center, backgroundColor: c.bg },
    shell: { ...result.shell, maxWidth: 1080 },
    content: { ...result.content, gap: 22 },
    logo: { ...result.logo, color: c.text, fontWeight: "800", fontSize: 30 },
    muted: { ...result.muted, color: c.muted },
    body: { ...result.body, color: c.muted, lineHeight: 23 },
    eyebrow: { ...result.eyebrow, color: c.muted, letterSpacing: 1.2 },
    empty: { ...result.empty, color: c.muted },
    footer: { ...result.footer, color: c.muted },
    card: {
      ...result.card,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: 26,
      padding: 22,
    },
    hero: {
      ...result.hero,
      backgroundColor: c.hero,
      padding: 26,
      borderRadius: 30,
    },
    heroAmount: {
      ...result.heroAmount,
      color: c.heroText,
      fontWeight: "800",
      fontSize: 40,
    },
    heroLabel: { ...result.heroLabel, color: c.heroText, fontWeight: "600" },
    heroCaption: { ...result.heroCaption, color: c.heroText },
    heroSmall: { ...result.heroSmall, color: c.heroText, fontWeight: "700" },
    heroStats: {
      ...result.heroStats,
      borderColor: dark ? "#a38fc9" : "#c8b6df",
    },
    button: {
      ...result.button,
      backgroundColor: dark ? "#715293" : "#674785",
      borderRadius: 22,
      minHeight: 48,
    },
    buttonText: { ...result.buttonText, color: "#ffffff", fontSize: 14 },
    secondary: { backgroundColor: c.soft },
    localBadge: { ...result.localBadge, backgroundColor: c.soft },
    month: { ...result.month, backgroundColor: c.soft, color: c.text },
    section: { ...result.section, fontSize: 23, fontWeight: "700" },
    cardTitle: { ...result.cardTitle, fontSize: 16, fontWeight: "600" },
    accountAmount: {
      ...result.accountAmount,
      color: c.text,
      fontWeight: "700",
    },
    track: { ...result.track, backgroundColor: c.soft, height: 9 },
    fill: { ...result.fill, backgroundColor: c.accent, height: 9 },
    link: { ...result.link, color: dark ? "#d2bafd" : "#76589f" },
    nav: {
      ...result.nav,
      backgroundColor: c.surface,
      borderColor: c.border,
      paddingVertical: 15,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
    },
    input: {
      ...result.input,
      backgroundColor: c.input,
      color: c.text,
      borderColor: c.border,
      borderRadius: 16,
      minHeight: 50,
    },
    label: { ...result.label, color: c.text },
    chip: {
      ...result.chip,
      borderColor: c.border,
      backgroundColor: c.soft,
      borderRadius: 18,
      minHeight: 44,
      justifyContent: "center",
    },
    chipSelected: {
      ...result.chipSelected,
      backgroundColor: dark ? "#715293" : "#674785",
      borderColor: c.accent,
    },
    sheet: {
      ...result.sheet,
      backgroundColor: c.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },
    overlay: { ...result.overlay, backgroundColor: "rgba(15,10,25,0.65)" },
    error: { ...result.error, color: dark ? "#ffa69d" : "#a93832" },
  });
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
