# Resume Context - 2026-05-25

## Ultimo estado estable

- Repo local limpio.
- Ultimo commit publicado en `main`: `459f2a4 Prepare app for Render backend`.
- Backend desplegado en Render:
  - URL base: `https://apuesta-mundial-api.onrender.com/api`
  - Health check confirmado: `GET /api/health` responde `{"status":"ok","service":"apuesta-mundial-api"}`.
- APK release generado localmente:
  - `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
  - Fecha: 2026-05-25 11:53
  - Tamano aproximado: 75.7 MB

## Trabajo completado en esta etapa

- Mobile apunta al backend Render en:
  - `apps/mobile/eas.json`
  - `apps/mobile/.env`
  - `apps/mobile/.env.example`
- PayPhone visible en pantalla de pago, pero deshabilitado.
- Backend bloquea `POST /payments/payphone/initiate` con `PAYPHONE_DISABLED`.
- Recuperacion de clave ya no expone `resetCode` si SMTP falla.
- Se agregaron popups/loading a pantallas pendientes relevantes.
- Se agregaron pruebas unitarias backend para reset password y PayPhone deshabilitado.
- Se agrego configuracion Jest con cache local dentro del repo.
- Se actualizo documentacion API/README y handoff.
- Se hizo commit y push a GitHub.
- Se genero APK release local con Gradle porque EAS requiere login Expo o `EXPO_TOKEN`.

## Validaciones ejecutadas

```bash
npm.cmd run check
npm.cmd --workspace services/api test -- --runInBand
```

Resultado: OK.

Build Android release:

```powershell
$env:NODE_ENV='production'; .\gradlew.bat :app:assembleRelease --no-daemon --console=plain --stacktrace
```

Resultado: `BUILD SUCCESSFUL`.

## Bloqueo actual

Al probar login desde APK, el backend en Render falla al consultar PostgreSQL:

```txt
connect ENETUNREACH 2600:1f14:271:c000:4d99:612c:e8bd:7275:5432 - Local (:::0)
```

Interpretacion: Render intenta conectar a Supabase por IPv6 usando la URL directa de PostgreSQL. El health check funciona porque no toca base de datos; login falla porque si consulta DB.

## Siguiente paso recomendado

Cambiar `DATABASE_URL` en Render para usar Supabase Pooler con SSL:

```txt
Project Settings > Database > Connection string > Pooler
```

Usar una URL similar a:

```txt
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Debe cumplir:

- Contener `pooler.supabase.com`.
- No usar `db.<project-ref>.supabase.co`.
- Incluir `?sslmode=require`.
- Tener la password real de PostgreSQL.

Luego en Render:

```txt
Environment > DATABASE_URL > guardar
Manual Deploy > Clear build cache & deploy
```

No hace falta recompilar APK para este cambio.

## Checklist pendiente

- [ ] Cambiar `DATABASE_URL` en Render a Supabase Pooler.
- [ ] Redeploy manual en Render.
- [ ] Confirmar login desde APK.
- [ ] Probar registro desde APK.
- [ ] Probar recuperacion de clave segun SMTP configurado.
- [ ] Completar perfil desde APK.
- [ ] Crear apuesta.
- [ ] Registrar transferencia bancaria.
- [ ] Revisar/aprobar transferencia desde admin.
- [ ] Ver reportes.
- [ ] Registrar resultado.
- [ ] Liquidar partido.
- [ ] Confirmar que PayPhone aparece deshabilitado.
- [ ] Revisar legal/regulatorio antes de dinero real.

## Nota para continuar con codex resume

Continuar desde este estado. No rehacer deploy, commit, cambio de URL mobile ni build APK salvo que haya nuevos cambios. El bloqueo principal es solo la conexion `DATABASE_URL` de Render hacia Supabase.
