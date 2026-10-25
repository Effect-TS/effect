---
"effect": patch
---

Fix `Toml.parse` to reject Unicode escapes that are not scalar values, as required by TOML 1.0.
