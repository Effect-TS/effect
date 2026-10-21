---
"effect": patch
---

Isolate `AtomHttpApi` and `AtomRpc` mutations by service ID so services sharing endpoint names or RPC tags invoke their own clients with their own arguments.
