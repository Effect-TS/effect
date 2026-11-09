---
"effect": patch
---

Add a `message` to `HttpClientErrorSchema` taken from its original reason, so `RpcClientError` HTTP failures no longer read as a bare `HttpError:`.
