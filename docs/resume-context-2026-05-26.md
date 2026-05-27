# Resume Context - 2026-05-26

## Ultimo estado estable

- Repo local limpio.
- Ultimo commit publicado en `main`: `714be38 Add transfer email notifications and total bets report`.
- Backend Render activo:
  - URL base: `https://apuesta-mundial-api.onrender.com/api`
  - Health check OK.
  - Endpoint nuevo `GET /reports/bets?page=1&pageSize=20` probado OK en Render.
- Supabase:
  - Migracion `database/migrations/009_email_delivery_failures.sql` aplicada.
  - Tabla `email_delivery_failures` confirmada.
- APK release recompilado:
  - Ruta: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
  - Fecha: 2026-05-26 21:19:10
  - Tamano: 75,683,197 bytes
  - Backend mobile: `https://apuesta-mundial-api.onrender.com/api`

## Trabajo completado

- Al aprobar transferencia:
  - pago queda `confirmed`.
  - apuesta queda `active`.
  - se intenta enviar correo al usuario con juego, pronostico, monto y marcador oficial si existe.
- Al rechazar transferencia:
  - pago queda `rejected`.
  - apuesta vuelve a `pending_payment` con `payment_status = rejected`.
  - se intenta enviar correo al usuario con juego, pronostico, monto, marcador oficial si existe y motivo de rechazo.
- Si el correo es invalido o falla SMTP:
  - no se revierte la aprobacion/rechazo.
  - se registra en `email_delivery_failures`.
- Reportes admin:
  - se agrego reporte total de apuestas en grid horizontal.
  - filtro por `fromDate` y `toDate`.
  - paginacion.
  - columnas: fecha de apuesta, usuario, juego, eleccion, apostado, ganado, resultado, pago, marcador oficial.
- Backend:
  - nuevo endpoint `GET /reports/bets`.
  - migracion para correos fallidos.
  - `SmtpMailService` exportado desde `AuthModule`.
- Documentacion:
  - `docs/api.md` actualizado.

## Validaciones ejecutadas

```bash
npm.cmd run api:build
npm.cmd run mobile:typecheck
npm.cmd --workspace services/api test -- --runInBand
```

Resultado: OK.

Build APK:

```powershell
$env:NODE_ENV='production'; .\gradlew.bat :app:assembleRelease --no-daemon --console=plain --stacktrace
```

Resultado: `BUILD SUCCESSFUL`.

Nota: Metro mostro un error de escritura de cache en `%TEMP%` despues del build, pero el APK se genero correctamente.

## Prueba realizada en Render

Como no habia transferencias pendientes reales, se crearon dos transferencias de prueba identificadas con usuarios `codex_test_*` y correos invalidos.

Resultados:

- Transferencia aprobada:
  - receipt: `approved`
  - payment: `confirmed`
  - bet: `active`
  - registro en `email_delivery_failures`: `bank_transfer_approved`, `INVALID_EMAIL_FORMAT`
- Transferencia rechazada:
  - receipt: `rejected`
  - payment: `rejected`
  - bet: `pending_payment`
  - registro en `email_delivery_failures`: `bank_transfer_rejected`, `INVALID_EMAIL_FORMAT`

El endpoint `GET /reports/bets?page=1&pageSize=20` mostro registros reales y de prueba.

## Archivos principales modificados en el ultimo commit

- `database/migrations/009_email_delivery_failures.sql`
- `services/api/src/modules/admin/admin.service.ts`
- `services/api/src/modules/auth/auth.module.ts`
- `services/api/src/modules/reports/reports.controller.ts`
- `services/api/src/modules/reports/reports.service.ts`
- `apps/mobile/src/screens/admin/AdminReportsScreen.tsx`
- `apps/mobile/src/screens/betting/BankTransferScreen.tsx`
- `docs/api.md`
- `docs/resume-context-2026-05-25.md`

## Pendientes y riesgos

- Hay datos de prueba `codex_test_*` en Supabase usados para validar aprobacion/rechazo. Decidir si se eliminan o se dejan como evidencia de prueba.
- Probar en telefono fisico con el APK nuevo.
- Probar correo real con una transferencia real y email valido.
- Render puede tener cold start en plan gratuito.
- PayPhone sigue visible pero deshabilitado.
- Revision legal/regulatoria pendiente antes de dinero real.
- No se ha generado commit para este archivo `docs/resume-context-2026-05-26.md`; fue creado al cierre de sesion.

## Siguiente paso recomendado

Instalar el APK nuevo en el telefono y probar el flujo admin real:

1. Login admin.
2. Ir a Reportes y revisar reporte total con filtros.
3. Crear una apuesta de usuario real.
4. Registrar transferencia.
5. Aprobar o rechazar desde admin.
6. Confirmar correo recibido.
7. Confirmar que no haya fila nueva en `email_delivery_failures` si el correo fue valido.

## Checklist pendiente

- [ ] Instalar APK `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- [ ] Probar login admin desde telefono.
- [ ] Revisar reporte total en admin.
- [ ] Probar filtros de fecha en reporte total.
- [ ] Probar paginacion del reporte total.
- [ ] Crear apuesta real desde usuario.
- [ ] Registrar transferencia real.
- [ ] Aprobar transferencia real desde admin.
- [ ] Confirmar correo de aprobacion.
- [ ] Rechazar otra transferencia real o de prueba.
- [ ] Confirmar correo de rechazo.
- [ ] Revisar `email_delivery_failures` tras pruebas con emails validos.
- [ ] Decidir si limpiar datos `codex_test_*`.
- [ ] Mantener PayPhone deshabilitado.
- [ ] Revision legal/regulatoria antes de dinero real.

## Nota para continuar con codex resume

Continuar desde este estado. No rehacer migracion, commit, push, deploy ni build APK salvo que haya nuevos cambios. El ultimo estado estable es commit `714be38`, migracion aplicada en Supabase, backend probado en Render y APK release generado el 2026-05-26 21:19:10.
