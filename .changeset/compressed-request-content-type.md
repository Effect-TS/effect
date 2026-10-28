---
"effect": patch
---

Fix `HttpClientRequest.compressBody` replacing the request's Content-Type with the body's content type. Compression now only updates the Content-Encoding and Content-Length headers.
