---
"effect": patch
---

Fix `RpcClient` protocol errors incorrectly failing requests started synchronously by error handlers. Only requests pending when the error broadcast begins now receive that error; new requests remain pending for their own responses.
