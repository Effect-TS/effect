---
"effect": patch
---

Fix `Pool.get` sometimes waiting forever when an acquisition fails, instead of failing with the acquisition error.
