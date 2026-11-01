---
"effect": patch
---

Fix cluster entity defect restarts sharing one backoff across all entities of a type; each entity now backs off on its own and resets once it completes a request.
