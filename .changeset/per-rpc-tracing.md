---
"effect": minor
---

Use `Rpc.TracingEnabled` to select automatic client and server spans per procedure and `remoteParent` to parent custom handler or middleware spans.

When invoking a handler or middleware directly, pass `remoteParent: undefined` if no client span context was received.
