---
"effect": patch
---

Fix HTTP RPC cancellation before the first response chunk and during buffered response collection so client aborts interrupt server-side requests and release their resources.
