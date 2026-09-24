# Configuración de integraciones

Superadministradores iniciales autorizados: `thetboard@gmail.com` y `lorela2114@gmail.com`.

La pantalla `/admin/configuration` permite seleccionar Mercado Pago, Stripe, WhatsApp, Brevo, Resend, Anthropic, OpenAI, Facturapi o R2 y reemplazar sus credenciales. Los campos secretos son de escritura exclusiva: ni la página ni la API permiten recuperar, copiar o revelar valores guardados. Los datos públicos (remitente, bucket, modo de prueba) sí se muestran. No hay proveedores ni endpoints arbitrarios.

## Activación inicial por el responsable del despliegue

1. Aplicar el cambio aditivo de esquema `20260924000000_integration_credentials` antes de arrancar el código nuevo. Agrega `User.isSuperadmin` (false por defecto) y la tabla `IntegrationCredential`; no modifica datos existentes. El despliegue actual usa `prisma db push`; **no ejecutar todas las migraciones históricas contra una base existente sin verificar su baseline**. Hacer respaldo y revisar diferencias de esquema primero.
2. Crear una clave aleatoria independiente de 32 bytes, codificada en base64, para `INTEGRATION_ENCRYPTION_KEY`. Guardarla como secreto del servidor y respaldarla por separado de la base de datos en el gestor de contraseñas del equipo. No usar contraseñas, `NEXTAUTH_SECRET` ni una API key como clave de cifrado. No imprimirla en registros ni compartirla por chat. Puede generarse localmente con un generador criptográfico; por ejemplo, PowerShell 7 permite copiarla directamente al portapapeles sin imprimirla:

   ```powershell
   [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | Set-Clipboard
   ```

   Pegar en el secreto del servidor y en el gestor de contraseñas; después limpiar el portapapeles. Ésta es una tarea inicial de infraestructura, no una tarea de operación cotidiana.
3. Configurar `SUPERADMIN_EMAILS=thetboard@gmail.com,lorela2114@gmail.com`. Es una lista explícita para otorgar el indicador al iniciar sesión; los demás administradores no se elevan automáticamente. Ambos usuarios deben cerrar sesión e iniciar sesión otra vez. Después del primer acceso se puede retirar la variable; los indicadores persisten en la DB.
4. Asegurar URLs canónicas HTTPS (`NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`). La API sólo acepta escrituras JSON desde esos orígenes, con sesión activa y autorización comprobada en DB.
5. Abrir **Configuración**, seleccionar un proveedor y usar **Importar desde servidor**. La importación sucede exclusivamente en el servidor: no devuelve secretos al navegador y no pisa valores existentes ni desactivados. Revisar estado en Pagos/Sistema y probar la integración antes de eliminar variables antiguas.
6. Guardar la firma de Mercado Pago en **Mercado Pago → Firma secreta del webhook**. La URL registrada sigue siendo `https://coffeebunncafe.com/api/webhooks/mercadopago` y el evento es `payment`. Continuar la prueba completa de compra/notificación descrita en [mercadopago.md](mercadopago.md).

## Operación cotidiana

- Escribir una nueva clave y guardar la reemplaza. Dejarla vacía conserva la anterior.
- **Desactivar** requiere confirmación y crea una marca que también bloquea la variable antigua del servidor. Para reactivar, guardar una nueva clave.
- Cada operación lee la configuración actual; no requiere reconstruir ni reiniciar el servicio. Las operaciones que ya estaban en curso pueden terminar con la clave anterior; coordinar rotaciones en el proveedor y verificar notificaciones pendientes.
- Antes de retirar las variables heredadas, confirmar la importación y probar pagos, correo y almacenamiento según corresponda. Mientras no exista un registro DB para una clave, se usa su variable de entorno. Un error de DB o de descifrado **no** vuelve silenciosamente a claves antiguas.
- La aplicación debe descifrar las claves en memoria para llamar a los proveedores. El control de escritura exclusiva protege la interfaz/API de administración; no puede ocultar secretos a quien controle el proceso del servidor o la clave maestra.

## Protección y recuperación

AES-256-GCM con nonce aleatorio de 12 bytes y etiqueta de autenticación de 16 bytes. Los datos asociados vinculan versión, proveedor y nombre de la clave para impedir intercambiar registros. Tanto claves como otros campos de proveedores se guardan cifrados en una tabla separada; no se usa `Setting.value` para secretos. La clave maestra nunca está en esa tabla.

Las escrituras y su auditoría comparten una transacción. La auditoría contiene actor, proveedor y nombres de campos, nunca valores, fragmentos ni ciphertext. Los permisos se consultan en DB en cada solicitud, incluidos usuarios inactivos. Las API antiguas de ajustes aceptan sólo campos de negocio autorizados. Se suprime captura de diagnósticos en la pantalla Configuración; no hay session replay instalado/inicializado.

Respaldar base de datos y clave maestra por separado. Perder la clave vuelve los valores irrecuperables: será necesario reintroducir/rotar las credenciales en cada proveedor. **No reemplazar la clave maestra directamente**: los registros anteriores ya no se descifrarían. Una rotación de la clave maestra requiere mantenimiento coordinado: respaldar, detener escrituras y consumidores, descifrar con la clave anterior y volver a cifrar todos los registros habilitados con una nueva, verificar, cambiar la variable del servidor y reiniciar. Esta pantalla rota credenciales de proveedores, no la clave maestra.

Para revocar un superadministrador, retirar su email de `SUPERADMIN_EMAILS` y revocar `User.isSuperadmin` mediante acceso de mantenimiento autorizado; desactivar `User.active` bloquea inmediatamente el acceso. No hay autoelevación desde las API genéricas de usuarios o roles.

Permanecen en infraestructura las credenciales necesarias para arrancar el sistema: conexión DB, clave maestra, firma de sesiones y Google OAuth. Los certificados fiscales y otras variables no consumidas por estas nueve integraciones no se importan. Las claves públicas de funciones de navegador que requieren compilación (por ejemplo Google Maps) tampoco forman parte de este panel.

Referencias: [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).
