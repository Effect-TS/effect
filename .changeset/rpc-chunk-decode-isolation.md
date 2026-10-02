---
"effect": patch
---

Keep streaming RPC chunk decode failures local to the affected request and interrupt it on the server, without disconnecting unrelated requests.
