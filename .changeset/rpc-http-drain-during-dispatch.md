---
"effect": patch
---

Fix framed HTTP RPC batches hanging when requests rejected during dispatch produce more responses than `streamBufferSize`.
