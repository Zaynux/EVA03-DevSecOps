# EVA03 — Desarrollo Seguro / DevSecOps

**Evaluación individual · CI3064 · 9 de noviembre de 2026**

Este repositorio presenta **dos entregables independientes** de la evaluación práctica: un reporte de riesgos comprensible para responsables de negocio y la versión corregida de la aplicación de laboratorio.

## Entregables

- [**Entregable 1 — Reporte de vulnerabilidades**](ENTREGABLE-1-REPORTE.md): qué problemas se encontraron, qué podrían causar y cómo fueron mitigados.
- [**Entregable 2 — Código seguro**](ENTREGABLE-2-CODIGO.md): solución implementada, instrucciones para reproducirla y resultados de las pruebas.
- [**Código fuente corregido**](src/app_vulnerable.js)

## Resultados principales

| Control | Inicial | Posterior |
|---|---:|---:|
| Hallazgos Semgrep | 3 | 1 (INFO, revisión manual CSRF) |
| Vulnerabilidades npm detectadas por Trivy | 0 | 0 |
| Login legítimo | — | HTTP 200 |
| Transferencia legítima con CSRF | — | HTTP 200 |
| Transferencia autenticada sin CSRF | — | HTTP 403 |

**Alcance:** laboratorio de aprendizaje, no servicio financiero de producción. Las pruebas se realizaron localmente sobre AWS EC2 Ubuntu 24.04. La alerta CSRF residual y las limitaciones del escaneo Trivy se explican en el reporte. El repositorio nunca debe contener el archivo privado `.env`.

## Autor

Martín Ottermann — Ingeniería en Ciberseguridad, INACAP.
