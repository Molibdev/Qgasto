# Arquitectura de Qgasto

## Cliente y dominio

Expo 58, React Native 0.88, React 19.3, TypeScript y Expo Router. `app/index.tsx` contiene navegación y formularios; `src/components/Settings.tsx` gestiona copias, sesión y Drive. `theme.tsx` centraliza paletas de día/noche y preferencia persistida. El panel incorpora patrimonio, balance del mes y distribución de gastos por categoría.

`src/domain/finance.ts` aplica operaciones puras validadas con Zod. Los importes son enteros en CLP. El saldo incluye saldo inicial, ingresos, gastos y transferencias históricas. Estas últimas ya no se pueden crear desde la UI; conservarlas evita alterar el patrimonio registrado en versiones anteriores. No se administran cupos ni ciclos de facturación de tarjetas. Los saldos pueden ser negativos.

Presupuestos por mes calendario y categoría, con avisos al 80% y 100%. Los aportes a metas reservan saldo existente sin generar gastos; no superan el objetivo ni el saldo libre al registrar el aporte. Los gastos posteriores pueden reducir su respaldo: no se bloquea el uso de la cuenta.

## Persistencia y restauración

TanStack Query mantiene la vista de datos y AsyncStorage conserva la copia del dispositivo. Las escrituras se serializan por perfil y se persisten antes de actualizar la UI. El invitado conserva la clave de almacenamiento original. Cada usuario de Supabase usa otra clave y caché independiente. Cerrar sesión no elimina su copia local.

`src/domain/backup.ts` define el formato JSON `qgasto-backup`, versión 1, fecha UTC y estado financiero completo. Zod y las comprobaciones de referencias e IDs rechazan archivos incompatibles. No se incluyen sesiones ni contraseñas. Importar muestra un resumen y exige confirmación antes de reemplazar; no mezcla colecciones. Máximo 10 MB. El archivo externo permite recuperar datos cuando se pierde el almacenamiento local; no depende del caché de la app. No está cifrado: almacenarlo en un lugar privado.

Excel es un informe separado, con nueve hojas (incluidos recurrentes e históricos). Los textos se exportan como celdas literales, sin convertir notas en fórmulas. No se usa XLSX como formato de restauración.

## Recurrentes

Reglas mensuales de gastos, con inicio, próxima fecha, cuenta, categoría, importe y pausa/reanudación. Se procesan al cargar, cada minuto con la app abierta y al regresar al primer plano. El ID por regla/fecha evita duplicados. El día original se conserva al atravesar meses cortos. Reanudar recupera los vencimientos pendientes. No se promete ejecución con el proceso cerrado; los vencimientos se recuperan al abrir. No se implementan todavía notificaciones ni recurrentes semanales/anuales.

## Autenticación y sincronización

Supabase Auth por correo/contraseña y Google OAuth PKCE. Sesiones nativas almacenadas en SecureStore en fragmentos; en web se usa AsyncStorage. Nunca se incluyen claves privadas de servidor. El almacenamiento financiero local no está cifrado por la app.

El cliente sincroniza instantáneas completas en `finance_snapshots`, con RLS por propietario y revisión optimista. La migración relacional original se conserva como base futura, pero el cliente no escribe simultáneamente ambas representaciones. La carga de nube valida el mismo esquema financiero. Los cambios se sincronizan después de guardar y al iniciar sesión/volver al primer plano. Tras un error de red puede reintentarse con Sincronizar ahora.

`src/domain/sync.ts` decide entre cargar nube, subir datos pendientes o avisar de conflicto. Un conflicto conserva lo local y requiere decisión explícita: descargar JSON antes de Cargar nube. No hay mezcla automática ni coordinación entre pestañas abiertas simultáneamente. No se transfieren datos del invitado al iniciar sesión: se trasladan mediante copia JSON.

## Drive y configuración pendiente

Se usa el token de proveedor de Google de la sesión para llamadas REST a Drive con alcance `drive.file`. Permite guardar copias JSON, listar las últimas 20 creadas por Qgasto y restaurarlas con confirmación. Conectar Google inicia sesión con esa cuenta y puede cambiar de perfil. Si el token Google caduca, hay que reconectar (Supabase renueva su sesión, no ese token).

Los respaldos en Drive son manuales. Automatizar con la aplicación cerrada requiere un flujo OAuth offline separado, refresh tokens cifrados en servidor, revocación, Edge Functions y Cron con jobs idempotentes; esa automatización no forma parte del código actual.

El usuario aún no tiene proyectos Supabase/Google. Se incluye [guía de activación](cloud-setup.md) y `.env.example`. No se han aplicado migraciones, probado RLS contra un servidor real ni completado OAuth real. No se considera validada una integración remota solo por pasar las pruebas locales.

## Validación y pendientes

`npm test`: reglas financieras, recurrentes, backup y conflictos de sincronización con transporte simulado. `npm run test:web`: navegador aislado, formularios, persistencia, modo nocturno, JSON descargado, pérdida simulada del almacenamiento, rechazo de archivo inválido, restauración, pausa de recurrente y Excel descargado. `npm run typecheck` y `npm run build:web` verifican tipos y empaquetado. Se necesitan pruebas con cuentas reales y teléfonos Android/iOS antes de publicar. Adjuntos, importación del Excel original, períodos personalizados y edición de movimientos siguen pendientes.

El PDF recibido contiene tres páginas de resumen y referencia una especificación más extensa y un Excel que no se adjuntaron; los detalles no explícitos son decisiones de implementación.

## Procedencia de dependencias

`xlsx` usa un alias a `@e965/xlsx` 0.20.3, redistribución comunitaria de SheetJS CE (repositorio `e965/sheetjs-npm-publisher`); no es un paquete publicado por el equipo oficial. La integridad queda en `package-lock.json`. El CDN oficial estaba bloqueado por la política del entorno inicial; no se desactivó TLS. Se puede migrar al tarball oficial tras habilitarlo y verificar su integridad.

La auditoría del MVP inicial reportó 0 avisos altos/críticos y 12 moderados transitivos en herramientas Expo (`glob`/`minimatch` y consumidores). No se fuerza el downgrade a SDK 53 sugerido por npm ni versiones mayores incompatibles. Revisar actualizaciones antes de producción.
