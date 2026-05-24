# API MVP

Base local:

```txt
http://localhost:3000/api
```

Swagger:

```txt
http://localhost:3000/api/docs
```

## Publicos

```txt
GET /health
POST /auth/register
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
GET /tournaments/current
GET /matches
GET /matches/by-date?date=2026-06-11
GET /matches/:id
GET /matches/:id/markets
```

## Protegidos

Requieren:

```txt
Authorization: Bearer <supabase-jwt>
```

```txt
GET    /me
PATCH  /me/profile
POST   /me/accept-terms
GET    /me/limits
PUT    /me/limits
POST   /bets/quote
POST   /bets
GET    /bets
GET    /bets/:id
POST   /payments/bank-transfer
GET    /payments/bank-accounts
POST   /payments/payphone/initiate
GET    /payments/:id
```

## Admin

Requieren rol `admin` u `operator`.

```txt
GET    /admin/dashboard
GET    /admin/fee-settings
POST   /admin/fee-settings
POST   /admin/fee-settings/:id/activate
GET    /admin/transfers/pending
POST   /admin/transfers/:id/approve
POST   /admin/transfers/:id/reject
POST   /admin/matches/:id/result
GET    /reports/summary
```
