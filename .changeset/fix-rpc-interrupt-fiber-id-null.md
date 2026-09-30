---
"effect": patch
---

The `RpcMessage.ExitEncoded` interrupt `fiberId` type now admits the `null` emitted by JSON encoding. Consumers reading encoded interrupts should handle `null` alongside `undefined`.
