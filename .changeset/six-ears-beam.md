---
"@effect/platform-node-shared": minor
"@effect/platform-browser": minor
"@effect/opentelemetry": minor
"@effect/platform-node": minor
"@effect/experimental": minor
"@effect/platform-bun": minor
"@effect/typeclass": minor
"@effect/platform": minor
"effect": minor
"@effect/schema": minor
"@effect/cli": minor
"@effect/printer": minor
"@effect/printer-ansi": minor
"@effect/rpc": minor
"@effect/rpc-http": minor
"@effect/vitest": minor
---

replace use of `unit` terminology with `void`

For all the data types.

```ts
Effect.unit; // => Effect.void
Stream.unit; // => Stream.void

// etc
```
