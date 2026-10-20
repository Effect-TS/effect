---
"effect": minor
"@effect/platform-node-shared": minor
---

Add `Terminal.size` to stream the current terminal dimensions and subsequent resizes on Node, Bun, and Deno. Existing `Terminal.make` calls remain compatible, with a fresh dimension snapshot per subscription when no size stream is supplied. Custom implementations constructed directly must provide `size` or use `Terminal.make`.
