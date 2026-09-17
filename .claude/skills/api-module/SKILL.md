---
name: api-module
description: Conventions for adding or changing a NestJS feature in apps/api (module layout, auth decorators, DTO validation, ApiError codes, Prisma migrations, e2e tests). Use when adding endpoints, entities or API behavior.
---

# Adding API features (apps/api)

## Layout

```
src/<feature>/
  <feature>.module.ts       # imports other feature modules it needs
  <feature>.controller.ts   # thin: validation + auth decorators + delegate
  <feature>.service.ts      # logic, Prisma access
  <feature>.dto.ts          # class-validator DTOs
src/common/                 # AppConfig, ClockService, PrismaService (+ lock helpers), ApiError, mappers, pagination
```

`CommonModule` is global: inject `PrismaService`, `AppConfig`, `ClockService` anywhere.

## Checklist

1. **Schema** — edit `prisma/schema.prisma` (snake_case `@map`, `@@map` table names, seconds as `Int`), then
   `cd apps/api && npx prisma migrate dev --name <change>`. Commit the migration folder.
2. **Config** — new env vars go in `src/config/app-config.ts` (typed + validated) and `.env.example`. Never read `process.env` elsewhere.
3. **DTO** — class-validator on every field; the global `ValidationPipe` uses `whitelist + forbidNonWhitelisted + transform`. Query numbers need `@Type(() => Number)`. Extend `PaginationQuery` for lists and return `{ items, total, page, pageSize }`.
4. **Auth** — global `AuthGuard` requires a web JWT by default.
   - `@Roles('admin')` / `@Roles('user')` on controller or handler.
   - `@Public()` for unauthenticated routes; desktop routes use `@Public()` + `@UseGuards(PcKeyGuard)`.
   - `@CurrentPrincipal()` gives `{ role, id, email, name }`.
5. **Errors** — `throw ApiError.badRequest(ErrorCode.X, 'English message', details?)` (also `notFound/conflict/forbidden/unauthorized`). New codes: add to `src/common/api-error.ts` **and** both languages in `packages/shared/src/i18n.ts`.
6. **Response shape** — map Prisma rows through `src/common/mappers.ts`; mirror new shapes in `packages/shared/src/types.ts`. Never return `passwordHash`/`tokenVersion`.
7. **Time** — use `ClockService.now()`, not `new Date()`, for anything tests may need to control.
8. **Concurrency** — mutations touching balances/sessions run in `prisma.$transaction(async tx => …)` with `lockPc` → `lockUsers` → `lockSession` in that order. See the `billing-change` skill.
9. **Tests** — add cases to `test/app.e2e-spec.ts` (fake clock + fake mail already wired). Run `npm test`.
10. **Docs** — update `docs/api.md` (endpoint table) and, if behavior-related, `docs/requirements.md`.

## Verify

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json && npm test
```
