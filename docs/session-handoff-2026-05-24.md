# Handoff Codex - 2026-05-24

## Estado estable

Proyecto ubicado en `D:\codex\Apuesta`.

Repositorio GitHub creado y publicado:

- URL: `https://github.com/gitPineda/apuesta-mundial-2026`
- Rama: `main`
- Commit inicial publicado: `a156c02 Initial MVP for World Cup betting app`

Ultima validacion relevante:

```bash
npm run check
npm run mobile:typecheck
```

El APK release para pruebas fisicas fue generado en:

```txt
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Cambios completados en esta sesion

- Se completo el flujo movil de recuperacion de clave:
  - pantalla para solicitar codigo por correo.
  - popup al enviar instrucciones.
  - pantalla para ingresar codigo recibido, nueva clave y confirmacion.
  - popup de exito y retorno automatico al Login.
- Se limpio la base para pruebas desde cero preservando configuracion:
  - equipos, sedes, torneo, partidos, mercados, cuotas, comisiones, cuentas bancarias y usuario admin.
  - transacciones, apuestas, pagos, comprobantes, ledger, resultados y usuarios normales quedaron en cero.
- Se genero APK release independiente de Metro.
- Se corrigio `Network request failed` para pruebas locales con HTTP:
  - `android:usesCleartextTraffic="true"` en APK generado.
  - app apuntando a `http://192.168.100.6:4000/api`.
- Se agrego icono de apuestas:
  - `apps/mobile/assets/icon.png`
  - `apps/mobile/assets/adaptive-icon.png`
- Se corrigio el menu inferior para dispositivo fisico:
  - `SafeAreaProvider` en raiz.
  - `useSafeAreaInsets` en tabs.
  - padding inferior dinamico en `Screen`.
- Se preparo GitHub:
  - `.gitignore` reforzado.
  - `render.yaml` agregado para despliegue futuro.
  - commit inicial subido al repo privado.

## Estado de datos tras limpieza

- `profiles`: 1 admin.
- `bets`: 0.
- `bet_selections`: 0.
- `payments`: 0.
- `bank_transfer_receipts`: 0.
- `ledger_entries`: 0.
- `match_results`: 0.
- `teams`: 48.
- `venues`: 18.
- `tournaments`: 1.
- `matches`: 104.
- `betting_markets`: 144.
- `odds`: 2808.
- `fee_settings`: 1.
- `bank_accounts`: 2.

## Configuracion actual importante

Mobile local APK:

```env
EXPO_PUBLIC_API_URL=http://192.168.100.6:4000/api
```

Para probar en telefono fisico:

- backend debe correr en puerto `4000`.
- telefono y PC deben estar en la misma red Wi-Fi.
- validar desde el navegador del telefono: `http://192.168.100.6:4000/api/health`.
- si la IP de la PC cambia, actualizar `apps/mobile/.env` y regenerar APK.

## Pendientes y riesgos

- Para produccion/Render, cambiar mobile a URL HTTPS de Render y regenerar APK.
- No usar `usesCleartextTraffic=true` en produccion si el backend ya esta en HTTPS.
- Render aun no se ha configurado; solo se dejo `render.yaml`.
- PayPhone sigue pendiente.
- El repo es privado, recomendado por tratarse de pagos/apuestas.
- Variables reales no deben subirse; deben ir en Render env vars.
- El fallback del reset password que devuelve codigo si SMTP falla debe quitarse antes de produccion.
- Falta convertir todas las pantallas restantes a popup/loading homogeneo.
- Falta test automatizado backend.
- Falta revision legal/regulatoria antes de dinero real.

## Siguiente paso recomendado

Subir backend a Render conectando el repo privado y configurando variables de entorno reales en Render.

Luego:

1. Verificar `https://<servicio-render>.onrender.com/api/health`.
2. Cambiar `EXPO_PUBLIC_API_URL` del mobile a la URL HTTPS de Render.
3. Recompilar APK release.
4. Repetir prueba completa desde telefono fisico.

## Checklist pendiente

- [ ] Crear Web Service en Render desde `gitPineda/apuesta-mundial-2026`.
- [ ] Configurar Root Directory: `services/api`.
- [ ] Configurar Build Command: `npm install && npm run build`.
- [ ] Configurar Start Command: `npm run start`.
- [ ] Cargar env vars reales en Render.
- [ ] Probar `/api/health` en Render.
- [ ] Actualizar mobile `.env` con URL HTTPS Render.
- [ ] Recompilar APK release.
- [ ] Probar registro, login, recuperacion de clave, perfil obligatorio, apuesta, transferencia, admin y reportes.
- [ ] Remover fallback de codigo de recuperacion antes de produccion.
- [ ] Implementar PayPhone.
- [ ] Agregar pruebas automatizadas.
- [ ] Revisar cumplimiento legal antes de habilitar dinero real.

