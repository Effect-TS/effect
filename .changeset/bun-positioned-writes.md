---
"@effect/platform-node-shared": patch
---

Pass explicit buffer bounds to positioned file writes so `write` and `writeAll` honor the logical cursor under Bun.
