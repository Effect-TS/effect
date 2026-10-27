---
"effect": patch
---

Fix `RpcClient` scope closure hanging when a streamed chunk fails to decode while the socket disconnects and never reconnects. The best-effort `Interrupt` sent to the server for the failed request no longer blocks client shutdown, and is still sent if the client stays open.
