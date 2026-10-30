---
"effect": patch
---

Document that a request accepted by an `RpcClient.Protocol` stays pending until a reply names it, and how a transport that only delivers requests acknowledges `discard` calls and rejects the rest.
