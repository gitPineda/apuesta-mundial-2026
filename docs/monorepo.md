# Estructura Monorepo

El proyecto esta organizado como monorepo para separar responsabilidades sin mezclar codigo movil, backend y base de datos.

```txt
apps/
  mobile/             App React Native + Expo

services/
  api/                Backend NestJS

database/
  migrations/         SQL para Supabase PostgreSQL
  seeds/              Datos demo
  imports/            Archivos JSON/CSV importables

docs/                 Documentacion tecnica
```

## Por Que Esta Separado Asi

- `apps/mobile`: solo contiene codigo de la app movil.
- `services/api`: solo contiene codigo backend.
- `database`: contiene SQL independiente del framework.
- `docs`: contiene decisiones, API y arquitectura.

Esto evita que Expo, NestJS y SQL queden mezclados en una sola carpeta.

## Comandos Desde La Raiz

```txt
npm install
npm run api:dev
npm run api:build
npm run api:migrate
npm run api:seed
npm run mobile:start
npm run mobile:typecheck
npm run check
```

## Variables De Entorno

La raiz tiene `.env.example` como referencia general.

Cada app mantiene su propio `.env.example`:

```txt
services/api/.env.example
apps/mobile/.env.example
```

Los valores reales deben ir en `.env`, no en `.env.example`.
