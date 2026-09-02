---
"effect": patch
---

Preserve zero and empty-string request IDs when decoding JSON-RPC acknowledgement and interruption messages, so valid correlation IDs are not discarded.
