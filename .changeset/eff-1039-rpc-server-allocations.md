---
"effect": patch
---

Reduce RPC server memory usage.

The handler context is now cached per (handler, request fiber context) pair
instead of rebuilt from two service maps on every request, synchronous schema
decode and encode results skip the effect wrappers, request envelopes are
decoded in place instead of copied, per-client latch maps are created lazily,
and JSON serialization parsers no longer allocate a `TextDecoder` per
connection.
