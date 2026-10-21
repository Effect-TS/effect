---
"effect": patch
"@effect/ai": patch
"@effect/platform": patch
"@effect/rpc": patch
---

Avoid throwing when `Error.stackTraceLimit` is non-writable (frozen intrinsics / SES / deterministic sandboxes such as Temporal).
