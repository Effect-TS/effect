---
"effect": patch
---

Fix HTTP RPC cancellation before the first response chunk, allowing server-side requests and their resources to be cleaned up when the client aborts. Buffered HTTP RPC responses also honor cancellation while waiting for completion.
