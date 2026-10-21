---
"effect": patch
"@effect/ai": patch
"@effect/platform": patch
"@effect/rpc": patch
---

Skip adjusting `Error.stackTraceLimit` when it is read-only under frozen intrinsics (SES lockdown, Temporal workflow sandbox) instead of throwing.
