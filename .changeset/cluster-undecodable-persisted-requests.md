---
"effect": patch
---

Fix cluster runners terminally failing persisted messages they cannot decode, whose RPC they do not know, or whose entity type they do not host, so a compatible runner can process them instead.
