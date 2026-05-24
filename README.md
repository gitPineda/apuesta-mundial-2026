# Apuesta Mundial 2026

Aplicacion movil para predicciones/apuestas deportivas del Mundial FIFA 2026, construida como MVP escalable con React Native + Expo, NestJS y Supabase PostgreSQL.

> Advertencia legal: este proyecto debe iniciar en modo demo/prediccion. No se debe activar dinero real sin revisar y cumplir la licencia, regulacion y obligaciones aplicables en Ecuador.

## Objetivo

Crear una app donde los usuarios puedan registrarse, ver el calendario del Mundial 2026, seleccionar partidos, crear predicciones/apuestas, pagar por transferencia o PayPhone en fases posteriores, y consultar su historial. El sistema debe ser administrable, auditable y preparado para crecer hacia produccion.

## Stack

- Frontend movil: React Native con Expo.
- Backend: NestJS.
- Base de datos: Supabase PostgreSQL.
- Autenticacion: JWT propio controlado por NestJS. Supabase se usa como PostgreSQL.
- Pagos: transferencia bancaria/manual y PayPhone.
- Storage: Supabase Storage para comprobantes.
- Deploy backend: Render.

## Arquitectura General

```txt
apps/mobile
  App React Native + Expo
  Pantallas de usuario
  Auth propio contra NestJS
  Cliente REST hacia NestJS

services/api
  API NestJS
  Reglas de negocio
  Validacion de roles
  Apuestas
  Pagos
  Administracion
  Auditoria

database
  Migraciones SQL
  Seeds
  Importadores JSON/CSV

docs
  Documentacion tecnica y funcional
```

Este repositorio esta organizado como monorepo npm con workspaces:

```txt
apps/mobile       App movil Expo
services/api      Backend NestJS
database          Migraciones, seeds e imports
docs              Documentacion
```

Desde la raiz se pueden ejecutar comandos comunes sin entrar manualmente a cada carpeta.

El frontend solo muestra datos y envia solicitudes. Toda validacion critica se realiza en el backend.

## Reglas Criticas

- Una apuesta no puede modificarse despues de confirmada.
- Una apuesta no puede activarse sin pago confirmado.
- Una apuesta no puede crearse despues del cierre configurado del partido.
- Por defecto, las apuestas cierran 60 minutos antes del inicio del partido.
- Las cuotas/multiplicadores se congelan al crear la apuesta.
- Las comisiones se congelan al crear la apuesta.
- El calculo oficial de ganancia se hace en NestJS.
- El frontend no decide montos, cuotas, pagos ni estados finales.
- Todo cambio importante se guarda en `audit_logs`.
- Las transferencias requieren numero de transferencia y datos del depositante.
- PayPhone solo puede confirmar pagos desde backend mediante callback/webhook validado.
- No se debe permitir doble pago ni doble confirmacion.

## Ejemplo De Cierre De Apuestas

Si un partido inicia a las 13:00, las apuestas cierran a las 12:00.

Si otro partido inicia a las 15:00, las apuestas cierran a las 14:00.

El cierre es por partido, no por todo el dia.

Mensaje esperado en la app:

```txt
Ya no se aceptan apuestas para este partido.
```

## Multiplicador Y Comisiones

El administrador podra configurar el multiplicador de pago por seleccion o mercado.

Ejemplo:

```txt
Apuesta: 10.00 USD
Multiplicador: 2.00
Pago bruto: 20.00 USD
Comision operativa 6%: 1.20 USD
Comision app 4%: 0.80 USD
Pago neto al usuario: 18.00 USD
```

Valores iniciales sugeridos:

```txt
Comision operativa: 6%
Comision app: 4%
```

Estos valores deben guardarse en la apuesta al momento de crearla para que cambios futuros no alteren apuestas anteriores.

## Modulos Backend

### auth

Emite y valida JWT propios del backend, protege endpoints y aplica roles.

### users

Gestiona perfil, mayoria de edad, aceptacion de terminos, KYC basico y limites de juego responsable.

### matches

Gestiona torneos, equipos, estadios, calendario, partidos por fecha, detalle de partido y estado de apuestas por partido.

### betting

Gestiona mercados, cuotas, calculo de posible ganancia, creacion de apuestas, congelamiento de cuotas y liquidacion.

### payments

Gestiona pagos por PayPhone, transferencias bancarias, comprobantes, idempotencia y estados de pago.

### admin

Gestiona CRUD administrativo, importacion de calendario, cuotas, comisiones, transferencias, resultados y liquidaciones.

### reports

Entrega metricas: total apostado, total pagado, ganancia de usuarios, utilidad bruta, apuestas pendientes y usuarios activos.

### audit

Registra acciones sensibles con actor, entidad afectada, valores anteriores, valores nuevos, IP y fecha.

## Modelo De Datos Principal

Tablas sugeridas:

```txt
profiles
roles
user_roles
terms_acceptance
responsible_gaming_limits
kyc_verifications

tournaments
teams
venues
matches
match_results

betting_markets
odds
bets
bet_selections

payments
payment_events
bank_accounts
bank_transfer_receipts

fee_settings
ledger_entries
audit_logs
admin_settings
```

## Estados De Apuesta

```txt
pending_payment
payment_review
paid
active
won
lost
void
refunded
```

## Estados De Pago

```txt
created
pending
confirmed
rejected
failed
refunded
```

## Flujo De Usuario

1. Registro con email, usuario y clave.
2. Confirmacion de email.
3. Login.
4. Completar perfil.
5. Verificar mayoria de edad.
6. Aceptar terminos.
7. Completar KYC basico.
8. Ver calendario del Mundial 2026.
9. Elegir fecha.
10. Elegir partido.
11. Seleccionar mercado y pronostico.
12. Ingresar monto.
13. Ver ganancia estimada.
14. Confirmar apuesta.
15. Elegir metodo de pago.
16. Consultar historial y estado.

## Flujo De Apuesta

```txt
Usuario selecciona partido
  -> backend valida que el partido acepta apuestas
  -> usuario elige mercado, seleccion y monto
  -> backend calcula quote
  -> usuario confirma
  -> backend congela cuota, multiplicador y comisiones
  -> apuesta queda pending_payment
  -> usuario selecciona metodo de pago
```

Validaciones obligatorias:

- Usuario autenticado.
- Usuario activo.
- Mayor de edad.
- Terminos aceptados.
- KYC minimo aprobado o pendiente segun fase.
- Limites de apuesta respetados.
- Partido no cerrado.
- Mercado abierto.
- Cuota activa.
- Monto permitido.

## Flujo De Pago Por Transferencia

```txt
Usuario elige transferencia
  -> app muestra cuenta bancaria configurada
  -> usuario ingresa numero de transferencia
  -> usuario ingresa banco, nombre y datos del depositante
  -> usuario sube comprobante
  -> apuesta queda payment_review
  -> admin aprueba o rechaza
```

Si el admin aprueba:

```txt
payment = confirmed
bet = active
```

Si el admin rechaza:

```txt
payment = rejected
bet = pending_payment o void
```

## Flujo De Pago Con PayPhone

```txt
Usuario elige PayPhone
  -> backend crea intento de pago
  -> backend guarda transactionId o paymentIntent
  -> usuario paga
  -> PayPhone confirma por callback/webhook
  -> backend valida monto, moneda, transaccion e idempotencia
  -> backend confirma pago
  -> backend activa apuesta
```

La app nunca debe marcar pagos como confirmados por si sola.

## Panel Administrador

Funciones necesarias:

- CRUD de equipos.
- CRUD de estadios.
- CRUD de partidos.
- Importar calendario JSON/CSV.
- Configurar cierre de apuestas por partido.
- Activar/desactivar apuestas.
- Configurar mercados.
- Configurar multiplicadores/cuotas.
- Configurar comision operativa y comision app.
- Ver apuestas por usuario.
- Ver pagos PayPhone.
- Ver transferencias pendientes.
- Aprobar/rechazar transferencias.
- Registrar resultados oficiales.
- Liquidar apuestas.
- Ver reportes.

## Endpoints Propuestos

### Usuario

```txt
GET    /me
PATCH  /me/profile
POST   /me/accept-terms
POST   /me/verify-age
POST   /me/kyc
GET    /me/limits
PUT    /me/limits
```

### Partidos

```txt
GET    /tournaments/current
GET    /matches
GET    /matches/by-date?date=2026-06-11
GET    /matches/:id
GET    /matches/:id/markets
```

### Apuestas

```txt
POST   /bets/quote
POST   /bets
GET    /bets
GET    /bets/:id
POST   /bets/:id/cancel
```

### Pagos

```txt
POST   /payments/payphone/initiate
POST   /payments/payphone/webhook
POST   /payments/bank-transfer
POST   /payments/:id/receipt
GET    /payments/:id
```

### Admin

```txt
GET    /admin/dashboard
POST   /admin/import/matches
GET    /admin/transfers/pending
POST   /admin/transfers/:id/approve
POST   /admin/transfers/:id/reject
POST   /admin/matches/:id/result
POST   /admin/matches/:id/settle
GET    /admin/fee-settings
POST   /admin/fee-settings
PATCH  /admin/fee-settings/:id
POST   /admin/fee-settings/:id/activate
```

## Pantallas Moviles

```txt
Login
Registro
Recuperar contrasena
Home
Calendario
Partidos por fecha
Detalle de partido
Crear apuesta
Resumen de apuesta
Pago
Transferencia bancaria
Subir comprobante
Historial
Detalle de apuesta
Perfil
Terminos y condiciones
KYC basico
Limites de juego responsable
Admin basico
```

## Variables De Entorno

Crear archivos `.env` usando `.env.example`. No subir secretos reales al repositorio.

Ejemplo:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres

JWT_SECRET=replace-in-production
JWT_EXPIRES_IN=7d

PAYPHONE_API_BASE_URL=https://pay.payphonetodoesposible.com/api
PAYPHONE_COUNTRY_CODE=593
PAYPHONE_STORE_ID=your-store-id
PAYPHONE_TOKEN=your-token

APP_PUBLIC_API_URL=http://localhost:3000
APP_ENV=development
```

## Seguridad

- Rotar cualquier secreto compartido en chats, documentos o repositorios.
- Usar HTTPS en produccion.
- Validar JWT en NestJS.
- Aplicar roles: `user`, `operator`, `admin`.
- Usar rate limiting.
- Registrar auditoria en operaciones criticas.
- Validar webhooks de PayPhone.
- Usar idempotencia para pagos.
- No confiar en calculos del frontend.
- Usar transacciones SQL para crear apuestas, selecciones y pagos.
- Evitar doble apuesta y doble pago con restricciones unicas e idempotency keys.

## Mundial 2026 Y Zona Horaria

El Mundial FIFA 2026 se juega del 11 de junio al 19 de julio de 2026.

El sistema debe guardar fechas en `timestamptz` y mostrar horarios segun la zona horaria del usuario.

No se deben quemar partidos en el codigo. El calendario debe importarse desde JSON/CSV o API externa.

## Plan Por Fases

### Fase 1: MVP demo sin dinero real

- Auth.
- Perfil.
- Mayoria de edad.
- Terminos.
- Calendario importable.
- Partidos demo.
- Mercados y cuotas demo.
- Crear predicciones/apuestas demo.
- Historial.
- Admin basico.

### Fase 2: Transferencia bancaria

- Cuentas bancarias configurables.
- Numero de transferencia obligatorio.
- Subida de comprobante.
- Revision admin.
- Activacion manual.

### Fase 3: PayPhone

- Crear pago desde backend.
- Guardar transaccion.
- Callback/webhook.
- Validacion de monto exacto.
- Idempotencia.

### Fase 4: Liquidacion automatica

- Registrar resultados oficiales.
- Evaluar apuestas.
- Calcular pagos netos.
- Crear movimientos de ledger.
- Reportes.

### Fase 5: Produccion

- Cumplimiento legal.
- KYC robusto.
- Monitoreo.
- Backups.
- Observabilidad.
- Hardening de seguridad.
- Revision antifraude.

## Como Ejecutar

### Desde La Raiz Del Monorepo

Instalar dependencias de todos los workspaces:

```txt
npm install
```

Compilar backend:

```txt
npm run api:build
```

Ejecutar migraciones:

```txt
npm run api:migrate
```

Ejecutar seed:

```txt
npm run api:seed
```

Levantar backend:

```txt
npm run api:dev
```

Levantar app movil:

```txt
npm run mobile:start
```

Verificar backend y mobile:

```txt
npm run check
```

### Backend NestJS

Entrar al backend:

```txt
cd services/api
```

Instalar dependencias:

```txt
npm install
```

En PowerShell, si `npm` esta bloqueado por politica de ejecucion, usar:

```txt
npm.cmd install
```

Crear `.env` desde `.env.example`:

```txt
cp .env.example .env
```

En Windows PowerShell:

```txt
Copy-Item .env.example .env
```

Compilar:

```txt
npm run build
```

Ejecutar migraciones:

```txt
npm run db:migrate
```

Ejecutar seed demo:

```txt
npm run db:seed
```

Iniciar en desarrollo:

```txt
npm run start:dev
```

API:

```txt
http://localhost:3000/api
```

Swagger:

```txt
http://localhost:3000/api/docs
```

### App movil Expo

Entrar a la app:

```txt
cd apps/mobile
```

Instalar dependencias:

```txt
npm install
```

Crear `.env` desde `.env.example`:

```txt
Copy-Item .env.example .env
```

Configurar:

```env
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3000/api
```

Para probar desde un dispositivo fisico, no uses `localhost` en `EXPO_PUBLIC_API_URL`; usa la IP LAN de tu computador, por ejemplo `http://192.168.1.10:3000/api`.

Iniciar Expo:

```txt
npm run start
```

Luego escanea el QR con Expo Go.

Estructura esperada:

```txt
services/api
  npm install
  npm run start:dev

apps/mobile
  npm install
  npx expo start
```

Para probar en dispositivo fisico, se usara Expo Go mientras el MVP no requiera modulos nativos. Si PayPhone requiere SDK nativo, se pasara a development build con EAS.

## Estado Actual Del Codigo

Ya existe una primera base de backend con:

- Proyecto NestJS en `services/api`.
- Conexion PostgreSQL con `pg`.
- Migracion inicial en `database/migrations/001_initial_schema.sql`.
- Seed demo en `database/seeds/001_worldcup_demo.sql`.
- Modulos `auth`, `users`, `matches`, `betting`, `payments`, `admin`, `reports`, `audit` y `health`.
- Validacion JWT propia del backend.
- Guard de roles `user`, `operator`, `admin`.
- Creacion de apuestas demo con cuota y comisiones congeladas.
- Cierre de apuestas por partido mediante `betting_closes_at`.
- Flujo inicial de transferencia bancaria con numero de transferencia obligatorio.
- Configuracion admin de comisiones.
- Endpoint base de PayPhone reservado para fase 3.

Tambien existe una primera app movil Expo en `apps/mobile` con:

- Navegacion de autenticacion.
- Tabs principales: Inicio, Calendario, Historial y Perfil.
- Auth propio contra NestJS con JWT.
- Cliente REST hacia NestJS.
- Pantallas de login, registro y recuperacion.
- Calendario demo navegable.
- Listado de partidos por fecha.
- Detalle de partido con mercados/cuotas.
- Flujo de crear apuesta demo.
- Flujo de pago por transferencia.
- Pantalla de historial.
- Perfil con mayoria de edad y terminos.
- Admin basico de resumen.

## Pendiente De Implementacion

- Conectar app Expo con credenciales reales en `.env`.
- Crear importador real JSON/CSV desde panel admin.
- Completar CRUD admin de equipos, estadios, partidos, mercados y cuotas.
- Integrar PayPhone contra documentacion oficial y ambiente real/sandbox disponible.
- Crear liquidacion automatica completa.
- Crear panel admin visual.
- Agregar pruebas automatizadas.
