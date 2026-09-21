# Bar Par Kenya API

Backend foundation for an Expo / React Native Web bar-exam preparation product.

## What is included

- Hono + TypeScript HTTP API
- PostgreSQL schema and Drizzle ORM migrations
- Guest-first authentication: learners can practise before creating an account
- Registration that upgrades the same guest learner, preserving progress
- Published subjects, topics, and server-scored multiple-choice questions
- Practice sessions, attempts, progress, streaks, and bookmarks
- Opt-in notification preferences and Expo/device push-token storage
- Guided-discovery checklist for the client
- Cloudflare R2 signed media uploads/downloads with server-generated keys
- A polished browser study dashboard served from the API root for local testing
- Docker and environment configuration suitable for Railway or Render
- Integration-style API tests using an in-memory store

The seed data intentionally contains only neutral study-skills demo content. Substantive Kenyan legal questions should go through legal/editorial review before publication.

## Local setup

Requirements: Node.js 22+ and Docker.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/` to use the browser testing dashboard. It creates a
guest learner automatically, then exercises subjects, practice sessions,
feedback, progress, bookmarks, and guest-to-account registration against the
same API origin.

If Docker/PostgreSQL is not available, `npm run dev:memory` starts the same
dashboard against the demo in-memory store for UI validation. Data resets when
that process stops; use the normal `npm run dev` path for persistent data.

Use a random secret of at least 32 characters for `JWT_SECRET` outside local development.

## Useful commands

```bash
npm test
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Client integration

1. Call `POST /v1/auth/guest` on first meaningful use and store the returned bearer token in secure storage.
2. Use that token for practice, progress, bookmarks, discovery, and notification preferences.
3. When the learner chooses to sync or protect progress, call `POST /v1/auth/register` with the guest token. The response contains a registered token for the same learner ID.
4. Never infer correctness in the client. The API reveals `correctOptionId` and the explanation only after an answer is submitted.

See [docs/API.md](docs/API.md) for the HTTP contract.

## Project structure

```text
src/app.ts              HTTP routes, validation, and response shaping
src/postgres-store.ts   PostgreSQL implementation of product behavior
src/db/schema.ts        Drizzle schema
src/db/migrate.ts       Migration runner
src/db/seed.ts          Safe demonstration content
src/auth.ts             Signed bearer tokens
test/                   End-to-end request-flow tests with an in-memory store
```

R2 is optional during local development. When its four environment values and `ADMIN_API_KEY` are configured, the admin media endpoints issue short-lived signed URLs. Browser uploads also require an R2 bucket CORS rule allowing `PUT` and the `Content-Type` header from your web origin.
