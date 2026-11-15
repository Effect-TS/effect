---
"effect": patch
---

Fix RPC socket request and acknowledgement write failures to fail with `RpcClientError` instead of defects, preserving the socket error reason.
