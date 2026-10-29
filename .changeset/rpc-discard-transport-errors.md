---
"effect": patch
---

Fail discarded RPC calls (`discard: true`) promptly on transport errors.

A discarded call waited for its pending send to finish before reporting any failure. While a socket was disconnected the call hung instead of failing, and once it reconnected the request was still sent and the handler ran. Failures now complete the call immediately and interrupt the pending send. Successful acknowledgements still wait for the send to finish.
