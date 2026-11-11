---
"effect": patch
---

Fix `ConfigProvider.fromEnv()` capturing the environment when called instead of at its first lookup, which ignored variables set after import.

Variables removed before the first lookup are no longer captured; use `ConfigProvider.fromEnvRecord({ ...process.env })` to snapshot at a chosen moment.
