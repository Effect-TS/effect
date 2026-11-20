---
"effect": patch
---

Use `Rpc.TracingEnabled` to select automatic client and server spans per procedure and `remoteParentSpan` to parent custom handler or middleware spans.

When invoking a handler or middleware directly, pass `remoteParentSpan: undefined` if no client span context was received.
