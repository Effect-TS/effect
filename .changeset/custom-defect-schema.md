---
"@effect/rpc": patch
---

Add optional `defect` parameter to `Rpc.make` for customizing defect serialization per-RPC. Defaults to `Schema.Defect`, preserving existing behavior.
