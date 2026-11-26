---
"effect": patch
---

Keep `ConfigError.message` readable after its `cause` is replaced, so test runners such as Vitest report the original config failure.
