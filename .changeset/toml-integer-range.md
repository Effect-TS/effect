---
"effect": patch
---

Fix `Toml.parse` to reject integers outside JavaScript's safe integer range instead of silently rounding them.
