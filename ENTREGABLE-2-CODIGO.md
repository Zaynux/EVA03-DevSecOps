# EVA03 — Entregable 2: Código seguro

**Asignatura:** Desarrollo Seguro (CI3064)  
**Estudiante:** Martín Ottermann  
**Fecha:** 9 de noviembre de 2026

## Objetivo

Se corrigió la aplicación del laboratorio sin eliminar la autenticación ni la simulación de transferencias. El archivo principal es [`src/app_vulnerable.js`](src/app_vulnerable.js).

## Qué se corrigió

- **Contraseñas:** bcrypt verifica un hash en vez de una contraseña escrita en el programa.
- **Secretos:** la clave JWT se lee desde `process.env.JWT_SECRET`; `.env` permanece privado.
- **Sesiones:** JWT firmado con expiración de 15 minutos y comprobación de sesión activa.
- **Cookies:** `HttpOnly`, `SameSite=Strict` y `Secure` configurable cuando se use HTTPS.
- **Transferencias:** autenticación obligatoria, token CSRF por sesión y validación de monto y destinatario.
- **Defensas adicionales:** encabezados de seguridad y límite de intentos de inicio de sesión.

## Preparación

Requiere Node.js, npm y los archivos del proyecto. Instala dependencias:

```bash
npm install
```

Genera un archivo local `.env` usando [`.env.example`](.env.example) como referencia. **No publiques valores reales.**

Para generar una clave aleatoria:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Para generar el hash de una contraseña sin introducirla como texto en el código:

```bash
read -rsp 'Contraseña del administrador: ' PASS; echo
PASS="$PASS" node -e "require('bcrypt').hash(process.env.PASS,12).then(console.log)"
unset PASS
```

Guarda los resultados en `JWT_SECRET` y `ADMIN_PASSWORD_HASH`, respectivamente, dentro del `.env` privado. En Linux ejecuta `chmod 600 .env` y comprueba que nunca quede registrado en Git.

Inicia la aplicación:

```bash
npm start
```

La aplicación escucha en `127.0.0.1:3000`. Los endpoints son `POST /api/login`, `GET /api/csrf-token`, `POST /api/transfer` y `POST /api/logout`. Para efectuar una transferencia, primero hay que iniciar sesión, conservar la cookie y obtener un token CSRF para enviarlo en `x-csrf-token`.

## Pruebas observadas en AWS EC2

| Verificación | Resultado |
|---|---|
| Login legítimo | HTTP 200 |
| Consulta CSRF sin autenticación | HTTP 401 |
| Transferencia sin autenticación | HTTP 401 |
| Obtención CSRF autenticada | HTTP 200 |
| Transferencia autenticada con CSRF | HTTP 200 |
| Transferencia autenticada sin CSRF | HTTP 403 |
| Semgrep antes/después | 3 → 1 hallazgo |
| Trivy npm | 0 vulnerabilidades conocidas |
| Validación de sintaxis | Sin errores |
| Auditoría npm | 0 vulnerabilidades conocidas |

La alerta informativa residual de Semgrep sobre CSRF permanece y está descrita en el [Reporte de vulnerabilidades](ENTREGABLE-1-REPORTE.md). La revisión Trivy también tuvo una limitación de compatibilidad en un módulo.

## Alcance

Las transferencias son simuladas y las sesiones se mantienen solo en memoria. **Este código es para evaluación educativa, no producción.** En un servicio público faltaría habilitar HTTPS y `Secure=true`, sesiones persistentes, base de datos, auditoría y pruebas adicionales.

**Reporte separado:** [Entregable 1 — Reporte de vulnerabilidades](ENTREGABLE-1-REPORTE.md).
