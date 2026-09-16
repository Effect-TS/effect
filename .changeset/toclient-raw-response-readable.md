---
"effect": patch
---

Fix `HttpServerResponse.toClientResponse` consuming a `raw(Response)` body on the first read. Reads now go through a clone of the wrapped `Response`, so `text`, `json`, `arrayBuffer` and `urlParamsBody` can be read more than once, matching `HttpClientResponse.fromWeb`.
