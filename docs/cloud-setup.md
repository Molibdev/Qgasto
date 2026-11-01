# Activar Supabase y Google Drive

No se necesita ninguna cuenta externa para las funciones locales, los recurrentes ni los respaldos JSON. Estos pasos solo son necesarios para activar autenticación, sincronización y Drive. No se ha creado ningún proyecto ni aplicado migraciones remotamente.

## 1. Crear Supabase

1. Crea una cuenta en https://supabase.com y un proyecto. Guarda la contraseña de la base de datos en tu gestor de contraseñas.
2. En el SQL Editor del proyecto ejecuta las migraciones de `supabase/migrations/` en orden: primero `202610310001_core.sql`, después `202611010001_snapshots.sql`. También puedes usar el CLI de Supabase enlazado al proyecto y `supabase db push`.
3. En la configuración del proyecto copia la URL del proyecto y su clave pública **anon o publishable**. Copia `.env.example` a `.env.local` e introduce ambos valores. Nunca uses una clave `service_role` en Expo. Las variables `EXPO_PUBLIC_*` son públicas y se incluyen en el bundle.
4. Reinicia Expo. En Ajustes → Cuenta y sincronización puedes crear una cuenta por correo/contraseña. Si está habilitada la confirmación de correo (recomendado), confirma antes de iniciar sesión.
5. En Authentication → URL Configuration configura Site URL y registra el origen web real que utilizas y `qgasto://` como redirecciones autorizadas para la aplicación nativa. Para producción usa el dominio HTTPS de tu aplicación, sin comodines amplios.
6. Comprueba con dos cuentas que los datos permanecen aislados; con dos dispositivos comprueba sincronización, modo offline y conflictos. Las políticas RLS deben impedir leer y modificar filas de otro usuario.

El cliente sincroniza **instantáneas JSON** en `finance_snapshots`. Las tablas relacionales de la migración original quedan como base para una futura migración de almacenamiento; no se escriben simultáneamente. La revisión optimista impide que un dispositivo sobrescriba silenciosamente datos remotos más recientes.

Al iniciar sesión se cambia de perfil local. Para trasladar datos del perfil sin sesión: descarga su JSON, inicia sesión e impórtalo. No se mezclan perfiles automáticamente. Cerrar sesión conserva la caché del perfil; en dispositivos compartidos considera la persistencia local de datos financieros.

## 2. Configurar Google

1. Crea un proyecto en https://console.cloud.google.com y habilita **Google Drive API**.
2. Configura la pantalla de consentimiento OAuth (nombre Qgasto, correo de soporte, usuarios de prueba mientras esté en modo de pruebas).
3. Crea un cliente OAuth de tipo Web. Añade como URI autorizada la URL callback que muestra Supabase al configurar el proveedor Google (normalmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`).
4. Activa Google en Authentication → Providers de Supabase. Introduce allí el Client ID y Client Secret. **El secret no debe estar en el código ni en las variables Expo.**
5. Desde Ajustes de Qgasto pulsa Conectar Google. Esto inicia sesión en la cuenta Google seleccionada y usa su perfil financiero; puede cambiar el usuario que estaba conectado.
6. Autoriza el scope `https://www.googleapis.com/auth/drive.file`. Permite que la app acceda a sus propios archivos, sin acceso completo al Drive del usuario.
7. Prueba Guardar copia en Drive y Ver copias de Drive. Selecciona una copia y confirma su restauración en Copias de seguridad.

El acceso a Drive utiliza el `provider_token` de esa sesión OAuth; cuando expire, vuelve a conectar Google. Supabase renueva su propia sesión, no el token del proveedor Google. Se listan las 20 copias más recientes creadas por Qgasto. Los archivos permanecen en Drive hasta que el usuario los elimine allí.

**No hay respaldo automático con la aplicación cerrada.** Para implementarlo se necesita un flujo de autorización offline separado, refresh tokens cifrados en servidor, revocación, Edge Functions y Cron con jobs idempotentes. Esta entrega realiza las copias cuando el usuario las solicita; no finge una automatización sin servidor configurado.

## Comprobación antes de publicar

- Aplicar migraciones en un proyecto de pruebas y verificar RLS con dos usuarios.
- Alta, confirmación, inicio/cierre de sesión, reinicio de app y cambio de perfil.
- Dos dispositivos editando la misma revisión: debe mostrarse conflicto sin pérdida de datos. Primero descargar JSON local; luego elegir explícitamente Cargar nube si se desea descartar lo local.
- Corte de red: guardar localmente y usar Sincronizar ahora tras recuperar conexión.
- Consentimiento cancelado, token Drive expirado, guardar/listar/restaurar copia.
- En móvil usar un development build con el esquema `qgasto`; configurar el callback real. Probar Android e iOS físicos.

Si usas una política de red restringida en el entorno cloud, habilita el hostname exacto de tu proyecto Supabase y `www.googleapis.com`; el navegador del usuario debe poder acceder a `accounts.google.com`. No reemplaces otras entradas de red que el entorno ya utilice.
