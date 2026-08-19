---
"effect": patch
---

Make server notifications first-class RPC messages.

`RpcMessage.FromServerEncoded` now includes `RequestEncoded`, so servers can
send server-originated requests and notifications (`isNotification: true`)
through `RpcServer.Protocol.send`. `RpcServer.Protocol` gains a
`supportsNotifications` flag, and the JSON-RPC serialization encodes
notifications as id-less requests. Buffered HTTP responses drop notifications
instead of folding them into the response batch. `McpServer` uses this instead
of casting notifications to untyped responses.
