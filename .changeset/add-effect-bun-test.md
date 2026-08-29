---
"@effect/bun-test": patch
---

Add the `@effect/bun-test` package: the `@effect/vitest` API (`it.effect`, `it.live`, `layer`, `it.prop`, `flakyTest`, `utils`) on Bun's native `bun:test` runner. Wrapper-managed timeouts abort the synthesized test context's `AbortSignal`, so Effect fibers are interrupted and their finalizers run on timeout.
