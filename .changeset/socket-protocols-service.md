---
"effect": patch
---

Add `SocketProtocols.Schema` for parsing the `Sec-WebSocket-Protocol` header, and an `HttpSocketProtocols` service that reads the requested sub-protocols from the current server request.
