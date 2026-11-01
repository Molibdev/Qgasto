import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { randomUUID } from "expo-crypto";
import { useFinance } from "../src/data/store";
import {
  Account,
  Command,
  Transaction,
  balance,
  clp,
  contributed,
  monthly,
  possibleDuplicate,
  spent,
  today,
} from "../src/domain/finance";
import { useTheme } from "../src/components/theme";
import { Settings } from "../src/components/Settings";
import { useAuth } from "../src/data/auth";
import { exportExcel } from "../src/data/export";

type Tab = "Inicio" | "Actividad" | "Cuentas" | "Planes" | "Ajustes";
type Form =
  | "income"
  | "expense"
  | "recurring"
  | "account"
  | "budget"
  | "goal"
  | "contribution"
  | "export";
const titles: Record<Form, string> = {
  income: "Nuevo ingreso",
  expense: "Nuevo gasto",
  recurring: "Nuevo recurrente mensual",
  account: "Nueva cuenta",
  budget: "Presupuesto mensual",
  goal: "Nueva meta",
  contribution: "Aportar a una meta",
  export: "Exportar a Excel",
};
const accountTypes: Record<Account["type"], string> = {
  bank: "Banco",
  cash: "Efectivo",
  credit: "Tarjeta de crédito",
};
function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { styles } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: styles.cardTitle.color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  number = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  number?: boolean;
}) {
  const { styles } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={number ? "numbers-and-punctuation" : "default"}
        style={styles.input}
        autoCapitalize="none"
      />
    </View>
  );
}
function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { styles } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((o) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: value === o.id }}
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.chip, value === o.id && styles.chipSelected]}
          >
            <Text
              style={{
                color: value === o.id ? "#fff" : styles.cardTitle.color,
              }}
            >
              {o.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {options.length === 0 && (
        <Text style={styles.muted}>
          Primero crea una cuenta o meta en su sección.
        </Text>
      )}
    </View>
  );
}
export default function Home() {
  const { styles, dark } = useTheme();
  const { session } = useAuth();
  const {
    data: s,
    error,
    isPending,
    save,
    saving,
    refetch,
    restore,
    sync,
    pull,
    syncMessage,
  } = useFinance();
  const [tab, setTab] = useState<Tab>("Inicio");
  const [form, setForm] = useState<Form | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<Account["type"]>("bank");
  const [goal, setGoal] = useState("");
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [to, setTo] = useState(today());
  const [message, setMessage] = useState("");
  const [duplicate, setDuplicate] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const open = (f: Form) => {
    setForm(f);
    setName("");
    setAmount("");
    setDate(f === "export" ? `${month}-01` : today());
    setTo(today());
    setAccount(s?.accounts[0]?.id ?? "");
    setCategory(
      s?.categories.find(
        (c) => c.type === (f === "income" ? "income" : "expense"),
      )?.id ?? "",
    );
    setType("bank");
    setGoal(s?.goals[0]?.id ?? "");
    setNote("");
    setMessage("");
    setDuplicate(null);
  };
  useEffect(() => {
    setForm(null);
  }, [session?.user.id]);
  if (isPending)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#20634c" />
        <Text style={styles.body}>Cargando tus finanzas…</Text>
      </SafeAreaView>
    );
  if (error || !s)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.body}>{error?.message ?? "Error al cargar"}</Text>
        <Button
          label="Reintentar"
          onPress={() => {
            void refetch();
          }}
        />
      </SafeAreaView>
    );
  const totals = monthly(s, month);
  const net = s.accounts.reduce((n, a) => n + balance(s, a.id), 0);
  const commit = async (command: Command) => {
    await save(command);
    setForm(null);
    setMessage("");
  };
  const submit = async () => {
    setMessage("");
    setBusy(true);
    try {
      if (form === "export") {
        await exportExcel(s, date, to);
        setForm(null);
        return;
      }
      if (!/^-?\d+$/.test(amount.trim()))
        throw new Error("Escribe un monto entero en CLP, sin puntos ni comas");
      const value = Number(amount);
      const id = randomUUID();
      switch (form) {
        case "account":
          await commit({
            kind: "account",
            value: { id, name, type, openingBalance: value, active: true },
          });
          break;
        case "income":
        case "expense": {
          const t: Transaction = {
            id,
            type: form,
            accountId: account,
            categoryId: category,
            amount: value,
            date,
            note,
          };
          if (possibleDuplicate(s, t)) {
            setDuplicate(t);
            return;
          }
          await commit({ kind: "transaction", value: t });
          break;
        }
        case "recurring":
          await commit({
            kind: "recurring",
            value: {
              id,
              type: "expense",
              accountId: account,
              categoryId: category,
              amount: value,
              startDate: date,
              nextDate: date,
              note,
              active: true,
            },
          });
          break;
        case "budget":
          await commit({
            kind: "budget",
            value: { id, categoryId: category, month, amount: value },
          });
          break;
        case "goal":
          await commit({
            kind: "goal",
            value: { id, name, target: value, accountId: account },
          });
          break;
        case "contribution":
          await commit({
            kind: "contribution",
            value: { id, goalId: goal, amount: value, date },
          });
          break;
      }
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.name === "ZodError"
            ? "Revisa los campos: nombre, fecha y monto válido son obligatorios."
            : e.message
          : "No se pudo guardar",
      );
    } finally {
      setBusy(false);
    }
  };
  const activity = [
    ...s.transactions.map((t) => ({
      id: t.id,
      date: t.date,
      title:
        t.note ||
        s.categories.find((c) => c.id === t.categoryId)?.name ||
        "Movimiento",
      detail: `${s.accounts.find((a) => a.id === t.accountId)?.name} · ${t.type === "income" ? "Ingreso" : "Gasto"}`,
      amount: t.amount,
      kind: t.type,
    })),
    ...s.transfers.map((t) => ({
      id: t.id,
      date: t.date,
      title: "Transferencia",
      detail: `${s.accounts.find((a) => a.id === t.fromId)?.name} → ${s.accounts.find((a) => a.id === t.toId)?.name}`,
      amount: t.amount,
      kind: "transfer",
    })),
  ]
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const plans = (
    <>
      <View style={styles.sectionHead}>
        <Text style={styles.section}>Presupuestos</Text>
        <Button
          label="+ Presupuesto"
          secondary
          onPress={() => open("budget")}
        />
      </View>
      {s.budgets
        .filter((b) => b.month === month)
        .map((b) => {
          const used = spent(s, b.categoryId, month);
          const ratio = used / b.amount;
          return (
            <View key={b.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>
                  {s.categories.find((c) => c.id === b.categoryId)?.name}
                </Text>
                <Text
                  style={{
                    color: ratio >= 1 ? "#db6856" : styles.cardTitle.color,
                  }}
                >
                  {Math.round(ratio * 100)}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, ratio * 100)}%`,
                      backgroundColor: ratio >= 1 ? "#c35b47" : "#67a78a",
                    },
                  ]}
                />
              </View>
              <Text style={styles.muted}>
                {clp(used)} de {clp(b.amount)}{" "}
                {ratio >= 1
                  ? "· Límite alcanzado"
                  : ratio >= 0.8
                    ? "· Cerca del límite"
                    : ""}
              </Text>
            </View>
          );
        })}
      {!s.budgets.some((b) => b.month === month) && (
        <Text style={styles.empty}>
          Define un límite mensual para cuidar tus gastos.
        </Text>
      )}
    </>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              qgasto<Text style={{ color: "#78a88e" }}>●</Text>
            </Text>
            <Text style={styles.muted}>Tu dinero, con intención.</Text>
          </View>
          <View style={styles.localBadge}>
            <Text style={{ color: styles.cardTitle.color, fontSize: 12 }}>
              ● En tu dispositivo
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionHead}>
            <Text style={styles.eyebrow}>
              {tab === "Inicio" ? "TU RESUMEN" : tab.toUpperCase()}
            </Text>
            <TextInput
              accessibilityLabel="Mes consultado AAAA-MM"
              value={month}
              onChangeText={setMonth}
              style={styles.month}
              maxLength={7}
            />
          </View>
          {tab === "Inicio" && (
            <>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Patrimonio total · CLP</Text>
                <Text style={styles.heroAmount}>{clp(net)}</Text>
                <Text style={styles.heroCaption}>
                  Tus cuentas, incluyendo la deuda de tarjetas
                </Text>
                <View style={styles.heroStats}>
                  <View>
                    <Text style={styles.heroLabel}>Ingresos del mes</Text>
                    <Text style={styles.heroSmall}>{clp(totals.income)}</Text>
                  </View>
                  <View>
                    <Text style={styles.heroLabel}>Gastos del mes</Text>
                    <Text style={styles.heroSmall}>{clp(totals.expense)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.wrap}>
                <Button label="− Gasto" onPress={() => open("expense")} />
                <Button
                  label="+ Ingreso"
                  secondary
                  onPress={() => open("income")}
                />
              </View>
              {s.accounts.length === 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    Un comienzo más tranquilo
                  </Text>
                  <Text style={styles.body}>
                    Agrega tu primera cuenta y su saldo actual. Después registra
                    tus movimientos para ver cómo evoluciona tu dinero.
                  </Text>
                  <Button
                    label="Crear mi primera cuenta"
                    onPress={() => open("account")}
                  />
                </View>
              )}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>Balance del mes</Text>
                <Text style={styles.accountAmount}>{clp(totals.income-totals.expense)}</Text>
                <Text style={styles.muted}>{totals.income>0?`${Math.round((totals.income-totals.expense)/totals.income*100)}% de tus ingresos queda después de gastos`:'Registra ingresos y gastos para conocer tu balance mensual.'}</Text>
              </View>
              {totals.expense>0&&<View style={styles.card}>
                <Text style={styles.section}>En qué estás gastando</Text>
                {s.categories.filter(c=>c.type==='expense').map(c=>({...c,total:spent(s,c.id,month)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,4).map(c=><View key={c.id} style={{gap:8}}><View style={styles.row}><Text style={styles.cardTitle}>{c.name}</Text><Text style={styles.muted}>{clp(c.total)}</Text></View><View style={styles.track}><View style={[styles.fill,{width:`${c.total/totals.expense*100}%`}]}/></View></View>)}
              </View>}
              {plans}
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Últimos movimientos</Text>
                <Pressable onPress={() => setTab("Actividad")}>
                  <Text style={styles.link}>Ver todos →</Text>
                </Pressable>
              </View>
            </>
          )}
          {(tab === "Inicio" || tab === "Actividad") && (
            <>
              {tab === "Actividad" && (
                <View style={styles.wrap}>
                  <Button label="− Gasto" onPress={() => open("expense")} />
                  <Button
                    label="+ Ingreso"
                    secondary
                    onPress={() => open("income")}
                  />
                  <Button
                    label="Exportar Excel"
                    secondary
                    onPress={() => open("export")}
                  />
                </View>
              )}
              {(tab === "Inicio" ? activity.slice(0, 5) : activity).map((t) => (
                <View key={t.id} style={styles.activity}>
                  <View
                    style={[
                      styles.icon,
                      {
                        backgroundColor: styles.secondary.backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 21, color: styles.cardTitle.color }}
                    >
                      {t.kind === "income"
                        ? "+"
                        : t.kind === "expense"
                          ? "−"
                          : "↔"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.cardTitle}>{t.title}</Text>
                    <Text style={styles.muted}>
                      {t.detail} · {t.date}
                    </Text>
                  </View>
                  <Text
                    style={{ fontWeight: "700", color: styles.cardTitle.color }}
                  >
                    {t.kind === "expense"
                      ? "−"
                      : t.kind === "income"
                        ? "+"
                        : ""}
                    {clp(t.amount)}
                  </Text>
                </View>
              ))}
              {activity.length === 0 && (
                <Text style={styles.empty}>
                  Aún no hay movimientos en este mes.
                </Text>
              )}
            </>
          )}
          {tab === "Cuentas" && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Tu dinero</Text>
                <Button label="+ Cuenta" onPress={() => open("account")} />
              </View>
              {s.accounts.map((a) => (
                <View style={styles.card} key={a.id}>
                  <Text style={styles.eyebrow}>{accountTypes[a.type]}</Text>
                  <Text style={styles.cardTitle}>{a.name}</Text>
                  <Text style={styles.accountAmount}>
                    {clp(balance(s, a.id))}
                  </Text>
                  {a.type === "credit" && (
                    <Text style={styles.muted}>
                      Saldo negativo = deuda pendiente.
                    </Text>
                  )}
                </View>
              ))}
              {s.accounts.length === 0 && (
                <Text style={styles.empty}>
                  Agrega una cuenta bancaria, efectivo o tarjeta.
                </Text>
              )}
            </>
          )}
          {tab === "Planes" && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Pagos recurrentes</Text>
                <Button
                  label="+ Recurrente"
                  onPress={() => open("recurring")}
                />
              </View>
              <Text style={styles.muted}>
                Gastos mensuales que se registran al abrir la app. La fecha
                inicial define el día del mes.
              </Text>
              {s.recurring.map((r) => (
                <View style={styles.card} key={r.id}>
                  <Text style={styles.cardTitle}>
                    {r.note ||
                      s.categories.find((c) => c.id === r.categoryId)?.name}
                  </Text>
                  <Text style={styles.body}>
                    {clp(r.amount)} · Próximo: {r.nextDate}
                  </Text>
                  <Button
                    label={r.active ? "Pausar" : "Reanudar"}
                    secondary
                    onPress={() => {
                      void save({ kind: "toggle-recurring", id: r.id }).catch(
                        (e) => setMessage(e.message),
                      );
                    }}
                  />
                </View>
              ))}
              <View style={styles.card}>
                <Text style={styles.eyebrow}>Balance del mes</Text>
                <Text style={styles.accountAmount}>{clp(totals.income-totals.expense)}</Text>
                <Text style={styles.muted}>{totals.income>0?`${Math.round((totals.income-totals.expense)/totals.income*100)}% de tus ingresos queda después de gastos`:'Registra ingresos y gastos para conocer tu balance mensual.'}</Text>
              </View>
              {totals.expense>0&&<View style={styles.card}>
                <Text style={styles.section}>En qué estás gastando</Text>
                {s.categories.filter(c=>c.type==='expense').map(c=>({...c,total:spent(s,c.id,month)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,4).map(c=><View key={c.id} style={{gap:8}}><View style={styles.row}><Text style={styles.cardTitle}>{c.name}</Text><Text style={styles.muted}>{clp(c.total)}</Text></View><View style={styles.track}><View style={[styles.fill,{width:`${c.total/totals.expense*100}%`}]}/></View></View>)}
              </View>}
              {plans}
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Metas de ahorro</Text>
                <Button label="+ Meta" secondary onPress={() => open("goal")} />
              </View>
              {s.goals.map((g) => (
                <View style={styles.card} key={g.id}>
                  <Text style={styles.cardTitle}>{g.name}</Text>
                  <Text style={styles.muted}>
                    {s.accounts.find((a) => a.id === g.accountId)?.name}
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.min(100, (contributed(s, g.id) / g.target) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.body}>
                    {clp(contributed(s, g.id))} de {clp(g.target)}
                  </Text>
                </View>
              ))}
              {!s.goals.length && (
                <Text style={styles.empty}>
                  Dale un propósito a tus ahorros.
                </Text>
              )}
              <Button
                label="Aportar a una meta"
                secondary
                onPress={() => open("contribution")}
              />
              <Text style={styles.muted}>
                Un aporte asigna saldo existente de la cuenta a la meta; no crea
                un gasto ni mueve dinero.
              </Text>
            </>
          )}
          {tab === "Ajustes" && (
            <Settings
              key={session?.user.id ?? "guest"}
              state={s}
              restore={restore}
              sync={sync}
              pull={pull}
              syncMessage={syncMessage}
            />
          )}
          <Text style={styles.footer}>QGASTO · UN PASO A LA VEZ</Text>
        </ScrollView>
        <View style={styles.nav}>
          {(
            ["Inicio", "Actividad", "Cuentas", "Planes", "Ajustes"] as Tab[]
          ).map((t, i) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: t === tab }}
              onPress={() => setTab(t)}
              style={styles.navItem}
            >
              <Text
                style={{
                  fontSize: 21,
                  color: tab === t ? styles.link.color : styles.muted.color,
                }}
              >
                {["$", "⇅", "▤", "◎", "⚙"][i]}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: tab === t ? "700" : "400",
                  color: tab === t ? styles.link.color : styles.muted.color,
                }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Modal
        visible={form !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy && !saving) setForm(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <View style={styles.sheet}>
            <ScrollView
              contentContainerStyle={{ padding: 24, gap: 18 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.section}>{form ? titles[form] : ""}</Text>
              {(form === "account" || form === "goal") && (
                <Field label="Nombre" value={name} onChange={setName} />
              )}
              {form === "account" && (
                <Choices
                  label="Tipo de cuenta"
                  value={type}
                  onChange={(v) => setType(v as Account["type"])}
                  options={Object.entries(accountTypes).map(([id, name]) => ({
                    id,
                    name,
                  }))}
                />
              )}
              {(form === "income" ||
                form === "expense" ||
                form === "recurring" ||
                form === "goal") && (
                <Choices
                  label="Cuenta"
                  options={s.accounts.filter(
                    (a) => form !== "goal" || a.type !== "credit",
                  )}
                  value={account}
                  onChange={setAccount}
                />
              )}
              {(form === "income" ||
                form === "expense" ||
                form === "budget" ||
                form === "recurring") && (
                <Choices
                  label="Categoría"
                  options={s.categories.filter(
                    (c) =>
                      c.type === (form === "income" ? "income" : "expense"),
                  )}
                  value={category}
                  onChange={setCategory}
                />
              )}
              {form === "contribution" && (
                <Choices
                  label="Meta"
                  options={s.goals}
                  value={goal}
                  onChange={setGoal}
                />
              )}
              {form !== "export" && (
                <Field
                  label={
                    form === "account"
                      ? "Saldo inicial CLP (negativo si es deuda)"
                      : form === "goal"
                        ? "Objetivo CLP"
                        : "Monto CLP (sin separadores)"
                  }
                  number
                  value={amount}
                  onChange={setAmount}
                />
              )}
              {form === "budget" && (
                <Field label="Mes AAAA-MM" value={month} onChange={setMonth} />
              )}
              {(form === "income" ||
                form === "expense" ||
                form === "recurring" ||
                form === "contribution" ||
                form === "export") && (
                <Field
                  label={
                    form === "export" ? "Desde AAAA-MM-DD" : "Fecha AAAA-MM-DD"
                  }
                  value={date}
                  onChange={setDate}
                />
              )}
              {form === "export" && (
                <>
                  <Field label="Hasta AAAA-MM-DD" value={to} onChange={setTo} />
                  <Text style={styles.muted}>
                    Incluye movimientos del intervalo y saldos actuales de
                    cuentas y metas. El archivo contiene datos financieros
                    personales.
                  </Text>
                </>
              )}
              {(form === "income" ||
                form === "expense" ||
                form === "recurring") && (
                <Field
                  label="Nota (opcional)"
                  value={note}
                  onChange={setNote}
                />
              )}
              {!!message && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {message}
                </Text>
              )}
              {duplicate ? (
                <View style={{ gap: 12 }}>
                  <Text style={styles.error}>
                    Ya existe un movimiento con la misma cuenta, categoría,
                    fecha y monto. ¿Quieres registrarlo igualmente?
                  </Text>
                  <Button
                    label="Registrar igualmente"
                    disabled={busy || saving}
                    onPress={() => {
                      setBusy(true);
                      void commit({ kind: "transaction", value: duplicate })
                        .catch((e) => setMessage(e.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                  <Button
                    label="Revisar campos"
                    secondary
                    onPress={() => setDuplicate(null)}
                  />
                </View>
              ) : (
                <Button
                  label={
                    busy || saving
                      ? "Guardando…"
                      : form === "export"
                        ? "Generar y compartir XLSX"
                        : "Guardar"
                  }
                  disabled={busy || saving}
                  onPress={() => {
                    void submit();
                  }}
                />
              )}
              <Button
                label="Cancelar"
                secondary
                disabled={busy || saving}
                onPress={() => setForm(null)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
