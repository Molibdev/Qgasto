# Qgasto

Finanzas personales en español y CLP: cuentas, ingresos, gastos, presupuestos, metas de ahorro y gastos recurrentes. Interfaz adaptable con modo claro/nocturno y almacenamiento local persistente.

## Ejecutar

Requiere Node.js 24 y npm 11.

```sh
npm ci
npm run web
# Android/iOS: cliente compatible con Expo SDK 58 o development build
npm start
```

Stack: Expo 58, React Native 0.88, React 19.3, Expo Router, TypeScript, TanStack Query, Zod, AsyncStorage, Supabase y SheetJS.

## Funciones

- Inicio con patrimonio bancario (sin tarjetas ni efectivo), cupos de tarjetas por separado, resumen mensual y avisos de presupuesto.
- Cuentas corriente/vista, tarjetas y efectivo: nombre, banco/emisor, mantención mensual informativa y, en tarjetas, cupo y día de facturación. Edición de metadatos sin alterar el saldo inicial.
- Ingresos y gastos con validación, advertencia de duplicados y selectores de calendario para fechas y meses.
- Presupuestos por categoría, metas y aportes con control de saldo disponible.
- Gastos recurrentes mensuales: recuperación de vencimientos al abrir la app, ejecución cada minuto mientras está abierta, pausa/reanudación e IDs idempotentes. Los días 29–31 se ajustan a meses cortos sin perder el día original. Reanudar recupera los vencimientos pendientes.
- Ajustes: modo claro/nocturno persistido, cuenta, sincronización y respaldos.
- **Copia JSON descargable y restaurable** con todos los datos financieros, incluidos recurrentes. Formato versionado, validación y confirmación antes de reemplazar el perfil actual. Sin contraseñas ni sesiones. Límite de importación de 10 MB. Guarda el archivo fuera de la app para recuperarlo después de reinstalar.
- Excel para análisis; no se usa como formato de restauración.
- Registro/inicio/cierre de sesión Supabase y sincronización de instantáneas con RLS y control de conflictos (requiere configurar proyecto).
- Google Drive: conexión OAuth con `drive.file`, guardar/listar/restaurar copias JSON (requiere configurar Google en Supabase). Copias manuales; no hay backups automáticos con la app cerrada.

Las opciones para crear transferencias se retiraron. Las transferencias **históricas** se conservan en los datos, saldos y exportaciones para no alterar registros anteriores. Los datos locales siguen disponibles sin cuentas externas; cada usuario autenticado tiene su propio perfil de dispositivo. La caché no sustituye a una copia externa y puede perderse al desinstalar o borrar almacenamiento.

## Activar nube

Consulta la [guía paso a paso para Supabase y Google](docs/cloud-setup.md). Sin esos proyectos configurados, la app muestra el estado de integración pendiente y permite usar todas las funciones locales. Nunca incluir `service_role` ni el secreto OAuth en el cliente.

## Verificar

```sh
npm run typecheck
npm test
npm run build:web
# Con dist servido en el puerto 8081 y Chromium disponible:
npm run test:web
```

Las pruebas cubren reglas financieras, recurrentes, respaldo/restauración JSON y flujo de navegador con modo oscuro. La integración remota y las pruebas en teléfonos necesitan los servicios y dispositivos correspondientes.

Más detalles: [arquitectura](docs/architecture.md). La especificación adjunta original contiene tres páginas de resumen y referencia una especificación extensa y un Excel no adjuntados.
