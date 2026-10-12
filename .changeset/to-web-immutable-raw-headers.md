---
"effect": patch
---

Merge outer headers and cookies into a copy of a raw `Response` in `HttpServerResponse.toWeb`, leaving the original headers unchanged. This supports immutable headers and prevents cookies from accumulating across requests that reuse a response. Responses with nothing to merge are returned unchanged.
