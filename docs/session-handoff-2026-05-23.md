# Handoff Codex - 2026-05-23

## Estado estable

Proyecto MVP de apuestas/predicciones Mundial FIFA 2026 en monorepo:

- Backend: NestJS en `services/api`.
- Mobile: Expo React Native en `apps/mobile`.
- DB: Supabase PostgreSQL.
- Auth: JWT propio del backend, no Supabase Auth.
- Pagos activos: transferencia bancaria/manual.
- PayPhone: reservado para fase posterior.

Ultima validacion ejecutada correctamente:

```bash
npm run check
```

Resultado: backend build y typecheck mobile OK.

## Cambios completados

- Registro con validacion de correo/usuario duplicado.
- Migracion para unicidad case-insensitive de `profiles.username`.
- Recuperacion de clave con variables SMTP y fallback MVP.
- Popup de cuenta creada y retorno automatico a Login.
- Gate obligatorio de perfil antes de usar la app.
- Reportes admin por partido y general.
- Correccion de total apostado: solo apuestas confirmadas.
- Correccion de duplicados en reporte por multiples pagos.
- Bloqueo de segunda apuesta por usuario/partido.
- Componentes moviles reutilizables:
  - `AppPopup`
  - `LoadingOverlay`
- Resultado admin:
  - loading en registrar resultado, liquidar y ver resumen.
  - mensajes por popup.
  - goles solo enteros >= 0.
  - campos vuelven a 0 al registrar resultado.
  - correccion de error `[object Object]` al ver resumen.
  - liquidacion idempotente si el partido ya fue liquidado.
- Limpieza de datos de prueba ejecutada preservando:
  - admin/operador
  - equipos
  - partidos
  - mercados
  - cuotas/multiplicadores
  - cuentas bancarias

## Datos preservados tras limpieza

- `matches`: 104
- `odds`: 2808
- `bank_accounts`: 2
- usuarios admin/operador: 1
- `bets`, `payments`, `bank_transfer_receipts`, `match_results`: 0

## Siguiente paso recomendado

Probar flujo completo desde cero:

1. Crear usuario normal.
2. Completar perfil obligatorio.
3. Apostar a un partido.
4. Subir transferencia.
5. Aprobar/rechazar desde admin.
6. Ver reportes por partido y general.
7. Registrar resultado.
8. Liquidar.
9. Volver a intentar liquidar y confirmar mensaje de ya liquidado.

## Pendientes importantes

- Convertir todos los mensajes de todas las pantallas a `AppPopup`; por ahora se priorizaron registro, crear apuesta, reportes y resultados.
- Agregar loading/popup a transferencias, pagos manuales, perfil, cuotas, cuentas bancarias y login.
- Agregar pantalla completa de reset de clave con codigo + nueva clave; actualmente solo solicita envio del codigo.
- Endurecer produccion: quitar fallback que devuelve `resetCode` si SMTP falla.
- Revisar si las apuestas rechazadas deben bloquear definitivamente nueva apuesta al mismo partido o si se permitira reintentar pago sobre la misma apuesta.
- Agregar pruebas automatizadas backend para:
  - reportes confirmados vs rechazados.
  - doble liquidacion.
  - segunda apuesta mismo usuario/partido.
- Agregar validaciones UI para fechas y formato de telefono en perfil.
- PayPhone sigue pendiente.
- Cumplimiento legal/licencia antes de dinero real.

