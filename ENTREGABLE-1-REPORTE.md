# EVA03 — Reporte de vulnerabilidades

**Asignatura:** Desarrollo Seguro (CI3064)  
**Estudiante:** Martín Ottermann  
**Fecha:** 9 de noviembre de 2026  
**Sistema evaluado:** Aplicación de ejemplo en Node.js alojada en AWS EC2 con Ubuntu 24.04.

## Resumen ejecutivo

Se revisó una aplicación de prueba que permite iniciar sesión y simular transferencias. **La versión original tenía fallas que podían facilitar el uso indebido de cuentas y operaciones**, especialmente si se utilizara con información real.

Se corrigieron los riesgos principales y se verificó que el inicio de sesión y las transferencias autorizadas siguieran funcionando. El análisis automático de Semgrep pasó de **3 hallazgos a 1**. La alerta restante corresponde a una comprobación de protección contra peticiones no autorizadas: la herramienta no reconoció el mecanismo utilizado, pero las pruebas demostraron que una transferencia sin el token requerido se rechaza. **Esto no equivale a una certificación de seguridad completa.**

## Principales vulnerabilidades encontradas

| N.º | Problema | Ubicación original | Consecuencia para la organización | Corrección realizada | Referencia |
|---|---|---|---|---|---|
| 1 | Clave de seguridad de los tokens escrita en el programa | `src/app_vulnerable.js`, línea 10 (usada en 27 y 45) | Si el código se filtra, un tercero podría intentar falsificar accesos. | La clave se genera aleatoriamente y se guarda fuera del código en `.env`. | OWASP A02 (2021): fallas criptográficas / A05: configuración insegura; STRIDE: suplantación, alteración |
| 2 | Contraseña del administrador guardada sin protección | `src/app_vulnerable.js`, línea 14 | Alguien con acceso al código podría conocer la contraseña inmediatamente. | La contraseña se verifica con **bcrypt**; solo se conserva su hash. | OWASP A07 (2021): fallas de identificación y autenticación; STRIDE: suplantación |
| 3 | Sesiones y cookies inseguras | `src/app_vulnerable.js`, líneas 27 y 30–32 | Una sesión robada podría facilitar el acceso indebido; el token también se devolvía en la respuesta. | Sesión con duración de 15 minutos, cookie `HttpOnly` y `SameSite=Strict`, y validación estricta del token. | OWASP A07/A05 (2021); STRIDE: divulgación de información, suplantación |
| 4 | Transferencia sin defensa adecuada frente a solicitudes fraudulentas | `src/app_vulnerable.js`, líneas 35–46 | Un atacante podría intentar provocar operaciones desde una sesión activa sin autorización consciente del usuario. | Se agregó protección con token CSRF por sesión y control de autenticación. | OWASP A04 (2021): diseño inseguro; STRIDE: alteración |
| 5 | Datos de transferencia sin controles suficientes | `src/app_vulnerable.js`, líneas 46–51 | Se podían enviar montos o destinatarios no válidos, poniendo en riesgo la integridad de las operaciones. | Validación del monto y destinatario antes de aceptar la operación. | OWASP A04 (2021); STRIDE: alteración |
| 6 | Texto que simulaba una credencial de AWS en un comentario | `src/app_vulnerable.js`, líneas 58–59 | Publicar claves reales en el código podría permitir accesos no autorizados a servicios cloud. | Se eliminó el comentario del código corregido; se excluye `.env` del control de versiones. | OWASP A05 (2021); STRIDE: divulgación de información |

**Nota:** las ubicaciones son del archivo *original*. La cadena con apariencia de clave AWS era una simulación educativa; no se demostró que fuera una credencial válida. Las categorías OWASP empleadas siguen la referencia Top 10 de 2021 utilizada como clasificación orientativa.

## Evidencias de análisis

### Antes de corregir

- **Semgrep:** 3 hallazgos con 200 reglas ejecutadas sobre 1 archivo. Detectó la falta de un mecanismo CSRF reconocido y dos usos de un secreto JWT escrito en el código (líneas 27 y 45).
- **Trivy:** 0 vulnerabilidades conocidas en las dependencias npm incluidas en `package-lock.json`. El informe inicial no reportó secretos ni configuraciones para los recursos evaluados.
- **Revisión manual:** detectó también la contraseña en texto plano, el token expuesto en la respuesta, la falta de expiración explícita y las validaciones insuficientes.

### Después de corregir

- **Semgrep:** 1 hallazgo de severidad **INFO** porque la regla no reconoce el middleware CSRF usado. Los dos hallazgos sobre JWT desaparecieron: **3 → 1** (reducción del 66,7 % en conteos de reglas).
- **Trivy, escaneo general:** 0 vulnerabilidades conocidas en npm y 4 observaciones de configuración dentro de `node_modules/bcrypt/Dockerfile`, un archivo de una dependencia externa, no de la aplicación.
- **Trivy, escaneo enfocado:** 0 vulnerabilidades conocidas en el archivo de bloqueo npm al excluir `node_modules`, las evidencias y el respaldo del código. La exclusión es deliberada y reduce el alcance.
- **Limitación:** Trivy 0.71.2 omitió al menos un módulo de configuración que exigía versión 0.72.0 o superior.

### Pruebas realizadas

| Prueba | Resultado | Qué demuestra |
|---|---|---|
| Consultar token CSRF sin sesión | HTTP 401 | Requiere autenticación |
| Transferencia sin sesión | HTTP 401 | Rechaza un acceso anónimo |
| Inicio de sesión con contraseña válida | HTTP 200 | Permite entrar al usuario legítimo |
| Cookie de sesión | `HttpOnly=true`, `SameSite=Strict` | Protecciones presentes en la respuesta |
| Solicitar token CSRF con sesión | HTTP 200 | Genera protección para operar |
| Transferencia autorizada con token CSRF | HTTP 200 | Operación legítima disponible |
| Transferencia con sesión pero sin CSRF | HTTP 403 | Bloquea la operación sin token |

Las peticiones se hicieron en el servidor mediante `127.0.0.1:3000`. No se probó una explotación real ni se realizaron transferencias bancarias.

## Riesgos pendientes y recomendación

**El sistema ha mejorado, pero no está listo para operar con dinero real.** La alerta informativa CSRF sigue visible y requiere revisión adicional. Las sesiones están en memoria y se pierden con un reinicio. La cookie `Secure` no se activa en las pruebas HTTP locales: para un despliegue público se necesita HTTPS. Tampoco se ha demostrado cobertura completa de las herramientas de análisis.

Se recomienda, antes de cualquier producción, incorporar HTTPS y cookies `Secure`, almacenamiento de sesiones, base de datos, auditoría de operaciones y pruebas más amplias de seguridad; asimismo, actualizar Trivy y repetir el análisis.

## Conclusión

La revisión permitió descubrir riesgos relevantes de acceso y transferencia, aplicar correcciones y comprobar que las funciones legítimas continúan operativas en los casos probados. Los resultados muestran una mejora verificable, pero deben entenderse como una evaluación de laboratorio, no como una garantía de seguridad completa.
