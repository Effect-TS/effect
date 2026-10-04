---
"@effect/vitest": patch
---

Fix `deepStrictEqual` and `notDeepStrictEqual` in `@effect/vitest/utils` throwing a `TypeError` instead of the assertion diff when no message is passed.
