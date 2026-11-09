---
"effect": patch
---

Give `HttpClientErrorSchema` a `message` taken from its original reason. An RPC client's HTTP failures now read `HttpError: Transport: connect ECONNREFUSED (POST http://localhost/rpc/)` instead of an empty message after `HttpError`.
