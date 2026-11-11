---
"effect": patch
---

Fix `ConfigProvider.fromEnv()` to snapshot the implicit environment on first lookup execution, so environment changes after import are observed.

The snapshot now includes changes made before the first lookup, including removed variables. If you need construction-time capture (for example, before clearing secrets from the environment), use `ConfigProvider.fromEnvRecord({ ...process.env })`. Explicit `env` behavior is unchanged.
