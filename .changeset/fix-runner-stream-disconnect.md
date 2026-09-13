---
"effect": patch
---

Interrupt non-persisted entity streams when their runner RPC scope closes, releasing handler resources after a caller disconnects. Disconnect cleanup respects `Uninterruptible: true`, `"client"`, and `"server"`, while explicit interrupts remain effective. Persisted streams retain their reconnect and resume behavior.
