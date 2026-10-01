---
"effect": patch
---

Release a stream chunk delivery blocked on a full buffer when the stream's consumer is interrupted, so it no longer stalls the protocol receive loop shared by every other request.
