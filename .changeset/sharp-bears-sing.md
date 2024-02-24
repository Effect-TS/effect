---
"effect": minor
---

Fix ConfigError `_tag`, with the previous implementation catching the `ConfigError` with `Effect.catchTag` would show `And`, `Or`, etc.
