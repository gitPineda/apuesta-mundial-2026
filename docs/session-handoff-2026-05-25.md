# Handoff Codex - 2026-05-25

## Cambios completados

- PayPhone queda visible en la pantalla de pago, pero deshabilitado y sin accion.
- El endpoint `POST /payments/payphone/initiate` queda bloqueado con `PAYPHONE_DISABLED` para evitar uso accidental.
- Se elimino el fallback de recuperacion de clave que exponia `resetCode` cuando SMTP fallaba.
- Se agregaron pruebas unitarias backend para:
  - confirmar que recuperacion de clave no devuelve `resetCode`.
  - confirmar que PayPhone permanece deshabilitado.
- Se agrego configuracion Jest con cache local ignorada por Git.
- Se homogeneizaron `LoadingOverlay` y `AppPopup` en:
  - Login.
  - Perfil.
  - Transferencia bancaria.
  - Admin transferencias.
  - Admin cuentas bancarias.
  - Admin cuotas.
  - Admin configuracion/comisiones.
- Se agrego validacion mobile basica para fecha de nacimiento `YYYY-MM-DD` y telefono de 7 a 15 digitos.

## Validacion ejecutada

```bash
npm.cmd run api:build
npm.cmd run mobile:typecheck
npm.cmd --workspace services/api test -- --runInBand
```

Resultado: build backend OK, typecheck mobile OK, 2 suites Jest OK.

## Pendientes que requieren entorno externo

- Desplegar backend en Render conectando el repo privado.
- Configurar variables reales en Render.
- Probar `https://<servicio-render>.onrender.com/api/health`.
- Cambiar `EXPO_PUBLIC_API_URL` del mobile a la URL HTTPS de Render.
- Recompilar APK release para produccion/pruebas contra Render.
- Ejecutar prueba funcional completa con base real: registro, login, recuperacion, perfil, apuesta, transferencia, admin, reportes y liquidacion.
- Revision legal/regulatoria antes de habilitar dinero real.

## Estado PayPhone

PayPhone no se implemento por decision de alcance. Debe permanecer visible como opcion futura, pero no habilitado.
