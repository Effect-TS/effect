---
"effect": patch
---

Fix cluster runners terminally failing persisted requests they cannot decode or whose RPC they do not know, so a compatible runner can process them instead.
