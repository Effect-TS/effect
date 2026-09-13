---
"effect": patch
---

Interrupt non-persisted entity streams when their runner RPC scope closes, releasing handler resources after a caller disconnects. Persisted streams retain their reconnect and resume behavior.
