---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
"effect": patch
---

Use SchemaBinary as the default RPC serialization for TCP cluster connections, including configurable frame limits.

Cluster payloads are encoded with the binary codec on the wire. When a persisted reply cannot be encoded for JSON storage, the defect fallback that storage records is now also the reply delivered to waiting callers, so live replies always match what was persisted.
