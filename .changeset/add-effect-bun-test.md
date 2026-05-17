---
"@effect/bun-test": minor
---

Add `@effect/bun-test` package — same API surface as `@effect/vitest`
(`it.effect`, `it.scoped`, `it.live`, `it.scopedLive`, `it.layer`, `it.prop`,
`flakyTest`, …) but backed by Bun's native `bun:test` runner. Closes #5964.
