# Arquitectura y decisiones del MVP

## Referencia y alcance

El PDF entregado es un resumen de tres páginas. La especificación extensa y el Excel de origen no están disponibles. La aplicación usa sus tecnologías y reglas explícitas; el detalle de formularios y esquema inicial son decisiones de implementación sujetas a refinamiento.

## Capas

- `app/`: Expo Router, navegación y formularios en español. Diseño adaptable a teléfono y navegador.
- `src/domain/finance.ts`: operaciones puras, validación con Zod e importes enteros CLP.
- `src/data/store.ts`: TanStack Query + AsyncStorage, escrituras serializadas y persistencia antes de actualizar la interfaz. Un fallo de lectura no borra datos.
- `src/domain/workbook.ts`: creación de las nueve hojas con SheetJS; celdas de texto no se convierten en fórmulas.
- `src/data/export.ts`: descarga web o FileSystem/Sharing en móvil.
- `supabase/migrations/`: esquema preparatorio. No aplicado a un proyecto remoto ni conectado al estado local.

## Reglas

El saldo es el inicial más ingresos menos gastos más transferencias entrantes menos salientes. Los movimientos futuros también afectan al saldo actual; el filtro mensual afecta al resumen y a la actividad. Las transferencias conservan el patrimonio y no aparecen como ingreso/gasto. Las compras con tarjeta disminuyen su saldo (deuda negativa) y los pagos aumentan ese saldo sin duplicar el gasto.

Se permiten saldos negativos para representar deuda o sobregiro. No se administra cupo ni facturación de tarjetas todavía. Los presupuestos son por mes calendario y categoría; guardarlos otra vez reemplaza su límite. El 80% y el 100% generan avisos dentro de la app.

Los aportes a metas reservan fondos existentes; no son movimientos. No pueden superar el objetivo ni el saldo libre de otras asignaciones en la misma cuenta. Los gastos posteriores pueden reducir el respaldo real de una meta: no se bloquea el uso del dinero ni se promete una cuenta segregada.

IDs UUID permiten reintentar una escritura sin duplicarla. Una coincidencia por cuenta, tipo, monto, categoría y fecha solicita confirmación. La persistencia está pensada para un solo dispositivo y una sola instancia abierta; no existe coordinación entre pestañas ni sincronización. No editar/importar/eliminar movimientos en esta entrega.

## Seguridad y servicios externos

El almacenamiento local no está cifrado por la aplicación: este MVP es para desarrollo y evaluación, sin garantía de custodia de datos sensibles. No guardar credenciales de Drive en AsyncStorage. No incluir `service_role` en Expo. La exportación contiene datos personales.

La migración prepara claves compuestas `(id, user_id)` para impedir referencias a datos ajenos, RLS por propietario y vistas con `security_invoker`. La autenticación, las funciones transaccionales para sincronización, las políticas de Storage y la auditoría requieren una etapa posterior. Probar aislamiento con dos usuarios y Supabase local antes de exponer un backend.

Drive requiere un proyecto Google, OAuth offline `drive.file`, almacenamiento seguro del refresh token en servidor y jobs idempotentes. Los respaldos automáticos deberán correr en Edge Functions/Cron, sin depender del background del teléfono. No están implementados ni se solicitan credenciales todavía.

## Validación

`npm test` cubre pagos de tarjeta sin doble gasto, transferencias, validación, duplicados, meses, reservas de metas y el contenido del XLSX. `npm run typecheck` verifica el cliente; `npm run build:web` empaqueta la aplicación. La validación en dispositivo, SQL con Supabase y OAuth requieren sus runtimes y no se consideran verificados por estos comandos.

## Dependencias revisadas

El paquete `xlsx` histórico de npm (0.18.5) tiene avisos de severidad alta. Se usa el alias exacto `xlsx: npm:@e965/xlsx@0.20.3`, una redistribución comunitaria de SheetJS CE 0.20.3 en npm (repositorio `e965/sheetjs-npm-publisher`), con integridad fijada por `package-lock.json`. No es un paquete publicado por el equipo oficial de SheetJS. El CDN oficial `cdn.sheetjs.com` está bloqueado por la política actual; no se ha modificado la política ni se ha desactivado TLS. Se puede migrar al tarball oficial una vez habilitado ese dominio y revisada su integridad.

Tras el cambio, `npm audit` informa 0 avisos altos/críticos y 12 moderados, transitivos en herramientas Expo (`glob`/`minimatch` y sus consumidores). No se fuerza el downgrade a SDK 53 que sugiere npm, ni se fuerzan versiones mayores incompatibles. Revisar las actualizaciones del SDK antes de publicar.
