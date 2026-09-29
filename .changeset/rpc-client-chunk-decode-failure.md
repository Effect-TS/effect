---
"effect": patch
---

End only the RPC stream whose chunk fails to decode, and interrupt that stream on the server, instead of failing every request on the client protocol.
