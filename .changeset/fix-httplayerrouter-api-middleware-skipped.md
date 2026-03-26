---
"@effect/platform": patch
---

Fix `HttpLayerRouter.addHttpApi` silently skipping API-level middleware.

When using `HttpLayerRouter.addHttpApi` with `HttpApiMiddleware` (e.g. bearer auth
that provides a `Session` service), the middleware was either skipped entirely or
its injected services (like `Session`) were unavailable inside route handlers.

**Root cause**: Route handlers were wrapped with `Effect.provide(handler, context)`
which calls `fiberRefLocally` and **replaces** the entire fiber context. Any services
injected at request time by API-level middleware via `provideServiceEffect` were
overwritten before the handler ran.

**Fix**: Replace `Effect.provide` with `Effect.mapInputContext` to **merge** the
captured build-time platform services into the runtime fiber context:

```ts
// Before (broken): replaces fiber context, loses Session
handler: Effect.provide(route.handler, context)

// After (fixed): merges build-time context into runtime context
handler: Effect.mapInputContext(route.handler, (input) => Context.merge(context, input))
```

This is the same pattern `HttpApiBuilder.group` already uses internally.

Fixes #6121.
