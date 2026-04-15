---
"@effect/rpc": patch
---

Fix `RpcSerialization` swallowing non-incomplete msgPack decode errors: the `decode` path caught every exception and re-entered the loop, hiding genuine protocol corruption as "need more data". Re-throw any error that is not the msgPack "Insufficient data" sentinel so callers see the real failure.
