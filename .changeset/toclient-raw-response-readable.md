---
"effect": patch
---

Fix repeated `text`, `json`, `arrayBuffer`, and `urlParamsBody` reads in `HttpServerResponse.toClientResponse` for raw Web `Response` bodies, preserving the original response for serving.
