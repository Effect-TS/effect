---
"effect": patch
---

Fix union-of-tag inference for flat RPC clients and `AtomRpc.query` and `AtomRpc.mutation`. Payloads and results now reflect the selected RPCs instead of resolving to `never`.
