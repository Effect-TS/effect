---
"effect": patch
---

Interrupt non-persisted entity streams when their runner RPC scope closes, releasing handler resources after a caller disconnects. Honor `Uninterruptible: true` and `"client"` annotations when receiving interrupt envelopes. Persisted streams retain their reconnect and resume behavior.
