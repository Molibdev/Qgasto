import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.QGASTO_URL || "http://127.0.0.1:8081");
  const button = (name) => page.getByRole("button", { name, exact: true });
  const field = (name) => page.getByRole("textbox", { name, exact: true });
  const save = async () => {
    await button("Guardar").click();
    await button("Cancelar").waitFor({ state: "hidden" });
  };
  await button("Crear mi primera cuenta").click();
  await field("Nombre de la cuenta").fill("Cuenta principal");
  await button("Santander").click();
  await field("Mantención mensual CLP").fill("3500");
  await field("Saldo inicial CLP (negativo si es deuda)").fill("500000");
  await save();
  await page.getByRole("tab", { name: "Cuentas" }).click();
  await button("+ Cuenta").click();
  await field("Nombre de la cuenta").fill("Mi tarjeta");
  await button("Tarjeta de crédito").click();
  await button("Banco Falabella").click();
  await field("Cupo total CLP").fill("300000");
  await button("Día de facturación mensual").click();
  await button("Día 20").click();
  await field("Saldo inicial CLP (negativo si es deuda)").fill("0");
  await save();
  await page.getByRole("tab", { name: "Inicio" }).click();
  await button("− Gasto").click();
  await button("Mi tarjeta").click();
  await field("Monto CLP (sin separadores)").fill("100000");
  await field("Nota (opcional)").fill("Compra mensual");
  await save();
  assert.equal(await button("↔ Transferir").count(), 0);
  await page.getByText("$200.000 disponible", { exact: true }).waitFor();
  await page.getByText("Patrimonio bancario · CLP", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Cuentas" }).click();
  await page.getByText("$500.000", { exact: true }).waitFor();
  const debtLabel = await page.evaluate(() =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(-100000),
  );
  await page.getByText(debtLabel, { exact: true }).waitFor();
  await button("Editar datos").first().click();
  await button("Cuenta vista").click();
  await button("BancoEstado").click();
  await field("Mantención mensual CLP").fill("4000");
  await save();
  await page.getByText("Cuenta vista", { exact: true }).waitFor();
  await page
    .getByText("Mantención mensual: $4.000 · informativo", { exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("tab", { name: "Cuentas" }).click();
  await page.getByText("Cuenta principal", { exact: true }).waitFor();
  await page.getByText("$500.000", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Planes" }).click();
  await button("+ Presupuesto").click();
  await field("Monto CLP (sin separadores)").fill("100000");
  await save();
  await page.getByText("100%", { exact: true }).waitFor();
  await button("+ Meta").click();
  await field("Nombre").fill("Emergencias");
  await field("Objetivo CLP").fill("200000");
  await save();
  await button("Aportar a una meta").click();
  await field("Monto CLP (sin separadores)").fill("100000");
  await save();
  await page.getByText("$100.000 de $200.000", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Actividad" }).click();
  await button("Exportar Excel").click();
  const downloadPromise = page.waitForEvent("download");
  await button("Generar y compartir XLSX").click();
  const download = await downloadPromise;
  await button("Cancelar").waitFor({ state: "hidden" });
  const wb = XLSX.read(readFileSync(await download.path()), { type: "buffer" });
  assert.equal(wb.SheetNames.length, 9);
  assert.equal(wb.Sheets.Resumen.E2.v, 100000);
  assert.equal(XLSX.utils.sheet_to_json(wb.Sheets.Transferencias).length, 0);
  await page.getByRole("tab", { name: "Ajustes" }).click();
  const jsonDownload = page.waitForEvent("download");
  await button("Descargar copia JSON").click();
  const backup = await jsonDownload;
  const backupPath = await backup.path();
  const contents = JSON.parse(readFileSync(backupPath, "utf8"));
  assert.equal(contents.format, "qgasto-backup");
  assert.equal(contents.data.accounts.length, 2);
  assert.equal(contents.data.accounts[0].bank, "BancoEstado");
  assert.equal(contents.data.accounts[0].bankType, "sight");
  assert.equal(contents.data.accounts[1].creditLimit, 300000);
  assert.equal(contents.data.accounts[1].billingDay, 20);
  await button("Cambiar a modo nocturno").click();
  await page.reload();
  await page.getByRole("tab", { name: "Ajustes" }).click();
  await button("Cambiar a modo claro").waitFor();
  await page.getByRole("tab", { name: "Actividad" }).click();
  await button("− Gasto").click();
  await field("Monto CLP (sin separadores)").fill("12345");
  const contrast = await field("Monto CLP (sin separadores)").evaluate(
    (el) => ({
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
    }),
  );
  assert.notEqual(contrast.color, contrast.bg);
  const luminance = (rgb) => {
    const a = rgb
      .match(/\d+/g)
      .slice(0, 3)
      .map(Number)
      .map((n) => {
        n /= 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const lum = [luminance(contrast.color), luminance(contrast.bg)].sort(
    (a, b) => a - b,
  );
  assert.ok(
    (lum[1] + 0.05) / (lum[0] + 0.05) >= 4.5,
    "Contraste de input nocturno >= 4.5:1",
  );
  await button("Fecha").click();
  await button("Hoy").click();
  await button("Cancelar").click();
  await button("Cancelar").waitFor({ state: "hidden" });
  await page.getByRole("tab", { name: "Ajustes" }).click();
  // Simula reinstalación: perder la base local y recuperar el archivo externo.
  await page.evaluate(() => localStorage.removeItem("qgasto:data:v1"));
  await page.reload();
  await button("Crear mi primera cuenta").waitFor();
  await page.getByRole("tab", { name: "Ajustes" }).click();
  const invalidChooser = page.waitForEvent("filechooser");
  await button("Cargar copia de seguridad").click();
  await (
    await invalidChooser
  ).setFiles({
    name: "roto.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await page.getByText(/Copia inválida o incompatible/).waitFor();
  assert.equal(await button("Confirmar restauración").count(), 0);
  const chooser = page.waitForEvent("filechooser");
  await button("Cargar copia de seguridad").click();
  await (
    await chooser
  ).setFiles({
    name: "respaldo.json",
    mimeType: "application/json",
    buffer: readFileSync(backupPath),
  });
  await button("Confirmar restauración").click();
  await button("Confirmar restauración").waitFor({ state: "hidden" });
  await page.getByText("Copia restaurada", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Planes" }).click();
  await button("+ Recurrente").click();
  await field("Monto CLP (sin separadores)").fill("10000");
  await button("Fecha").click();
  await field("Año del calendario").fill("2099");
  const currentMonth = new Date().toLocaleDateString("en-CA", {
    month: "2-digit",
  });
  await page.screenshot({ path: "/tmp/qgasto-calendar.png" });
  await button(`2099-${currentMonth}-15`).click();
  await field("Nota (opcional)").fill("Recurrente de prueba");
  await save();
  await page.getByText("Recurrente de prueba", { exact: true }).waitFor();
  await button("Pausar").click();
  await button("Reanudar").waitFor();
  await page.getByRole("tab", { name: "Cuentas" }).click();
  await button("+ Cuenta").click();
  await field("Nombre de la cuenta").fill("Billetera");
  await button("Efectivo").click();
  await field("Saldo inicial CLP (negativo si es deuda)").fill("50000");
  await save();
  await page.getByRole("tab", { name: "Inicio" }).click();
  await page.getByText("$500.000", { exact: true }).waitFor();
  await page.getByText("$50.000", { exact: true }).waitFor();
  await button("Mes consultado").click();
  await field("Año del calendario").fill("2028");
  await button("Febrero 2028").click();
  await page
    .getByText("Ingresos del mes de febrero", { exact: true })
    .waitFor();
  await button("Mes consultado").click();
  await button("Hoy").click();
  await page.screenshot({
    path: "/tmp/qgasto-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Sin overflow horizontal en móvil",
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "/tmp/qgasto-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: cuentas, gasto con tarjeta, sin transferencias, persistencia, modo oscuro, backup JSON restaurado, recurrente pausado, presupuesto, meta, aporte, descarga XLSX y diseño móvil/escritorio; sin errores de JavaScript.",
  );
} catch (error) {
  await page.screenshot({ path: "/tmp/qgasto-error.png" });
  throw error;
} finally {
  await browser.close();
}
