---
"effect": patch
---

Fix a discarded RPC call (`discard: true`) waiting for its send to finish before reporting a failure. While a socket was disconnected the call hung instead of failing with the transport error, and after reconnecting the request was still sent and the handler ran, while the call failed with the earlier error. A failure now completes a discarded call at once, as it does for other calls.
