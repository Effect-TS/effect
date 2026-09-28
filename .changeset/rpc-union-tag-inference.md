---
"effect": patch
---

Flat RPC clients and `AtomRpc` `query` and `mutation` now accept a union of RPC tags, inferring the result, error and services of each selected RPC instead of `never`. `Rpc.ExtractTag` now extracts every RPC matching a union of tags.
