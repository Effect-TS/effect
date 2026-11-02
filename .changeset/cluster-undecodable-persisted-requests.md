---
"effect": patch
---

Fix cluster runners terminally failing persisted messages they cannot decode, whose RPC they do not know, or whose entity type they do not host, so a compatible runner can process them instead. Later requests for the same entity wait behind such a request, so they are still processed in order. A request no runner can decode now stalls its entity until it is removed from storage, and is reported with a warning.
