# Qgasto

Aplicación móvil de finanzas personales, en español y con pesos chilenos (CLP). Permite registrar ingresos y gastos, gestionar cuentas y tarjetas, transferir dinero, controlar presupuestos mensuales, aportar a metas y exportar los datos a Excel.

## Stack

Expo SDK 58, React Native 0.88, React 19.3, TypeScript y Expo Router. TanStack Query administra el estado persistido, Zod valida datos y AsyncStorage permite usar el MVP sin credenciales. Supabase/PostgreSQL es la arquitectura prevista para autenticación y sincronización; se incluye una migración inicial con RLS. Excel usa SheetJS; FileSystem y Sharing permiten compartir archivos en el teléfono.

## Desarrollo

Requiere Node.js 24 y npm 11.

```sh
npm ci
npm start
# Navegador
npm run web
# Validaciones
npm run typecheck
npm test
npm run build:web
```

En Android/iOS usa un cliente compatible con SDK 58 o un development build. Compilar iOS requiere macOS/Xcode; este entorno Linux valida TypeScript, reglas financieras y el bundle web.

## MVP implementado

- Inicio con saldos, ingresos y gastos del mes, actividad y alertas de presupuesto.
- Cuentas bancarias, efectivo y tarjetas de crédito. Los saldos iniciales pueden ser negativos para representar deuda.
- Ingresos y gastos con fecha, categoría, nota y advertencia de posibles duplicados.
- Transferencias entre cuentas: no cuentan como ingreso ni gasto. Un pago a tarjeta es una transferencia; la compra se registra como gasto al realizarla.
- Presupuestos por categoría y mes, metas y aportes vinculados a una cuenta de ahorro.
- Persistencia local al reiniciar y exportación manual XLSX por intervalo de fechas, con nueve hojas.

La aplicación empieza vacía; los datos se conservan en el dispositivo/navegador. No contiene cuentas de demostración ni envía información financiera a un servidor. Los aportes a metas asignan saldo disponible de una cuenta; para mover dinero entre cuentas registra primero una transferencia.

## Backend y próximas etapas

Consulta [arquitectura y alcance](docs/architecture.md). `supabase/migrations/202610310001_core.sql` prepara el núcleo multiusuario con RLS; todavía no está conectado al cliente. No introduzcas claves privadas en la aplicación.

Pendiente: autenticación y sincronización Supabase, recurrentes automáticos, notificaciones, adjuntos, importación del Excel original, períodos personalizados y respaldo automático en Drive mediante OAuth `drive.file`, Edge Functions y Cron. La exportación actual es manual y local; las hojas de recurrentes y reportes muestran el alcance disponible.

## Documento de referencia

El PDF recibido contiene **3 páginas de resumen**, aunque hace referencia a una especificación de 26 páginas y a un Excel que no se adjuntaron. Las decisiones no detalladas allí se documentan como supuestos del MVP. Las versiones se verificaron en npm al iniciar el desarrollo.

## Prueba funcional web

Después de `npm run build:web`, sirve `dist` en el puerto 8081 y ejecuta `npm run test:web` (requiere Chromium en `/usr/bin/chromium`, o `CHROMIUM_PATH`). Se puede cambiar el destino con `QGASTO_URL`. La prueba crea datos únicamente en un contexto de navegador desechable y comprueba cuentas, tarjeta, transferencia, recarga, presupuestos, metas y el Excel descargado.

La auditoría actual tiene 0 avisos altos/críticos y 12 moderados en herramientas de Expo. La distribución de SheetJS y las limitaciones están detalladas en [arquitectura](docs/architecture.md#dependencias-revisadas).
