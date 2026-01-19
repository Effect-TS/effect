---
"effect": minor
"@effect/unplugin": minor
---

Add source location tracing for Effect.gen

This release introduces build-time instrumentation for Effect that injects source location metadata into `Effect.gen` yield expressions. This enables automatic log prefixing, OpenTelemetry code attributes, and DevTools integration.

**New Features:**

- `SourceLocation` module - Types and utilities for source location metadata
- `FiberRef.currentSourceTrace` - FiberRef for tracking current source location
- `Effect.gen` adapter now accepts optional trace parameter
- Logger integration - `stringLogger`, `logfmtLogger`, and `structuredLogger` now include source location when available

**New Package: @effect/unplugin**

A universal bundler plugin that transforms Effect code at build time:

```typescript
// vite.config.ts
import effectPlugin from "@effect/unplugin/vite"

export default {
  plugins: [
    effectPlugin({
      sourceTrace: true
    })
  ]
}
```

Supports: Vite, Rollup, Webpack, esbuild, and Rspack.

**Example Output:**

Before transformation:
```typescript
Effect.gen(function* (_) {
  const user = yield* _(getUserById(id))
  yield* _(Effect.log("Got user"))
  return user
})
```

After transformation:
```typescript
const _trace0 = { [Symbol.for("effect/SourceLocation")]: ..., path: "UserRepo.ts", line: 2, column: 18, label: "user" }
const _trace1 = { [Symbol.for("effect/SourceLocation")]: ..., path: "UserRepo.ts", line: 3, column: 11 }

Effect.gen(function* (_) {
  const user = yield* _(getUserById(id), _trace0)
  yield* _(Effect.log("Got user"), _trace1)
  return user
})
```

Logs now include source locations:
```
timestamp=... level=INFO fiber=... source=UserRepo.ts:3 message="Got user"
```
