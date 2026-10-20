---
"effect": minor
"@effect/platform-node-shared": minor
---

Add `Terminal.size`, a scoped queue that starts with the current terminal dimensions and receives each resize. Custom terminals passed to `Terminal.make` must now supply `size`.
