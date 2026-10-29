---
"effect": patch
---

Add `supportsReplies` to `RpcClient.Protocol` for one-way transports that deliver requests but never reply. On such a protocol, a call with `discard: true` completes once its request is sent and keeps no request state, and other calls fail with an `RpcClientError` without being sent. Built-in protocols set it to `true`. Custom protocols must now set the field.
