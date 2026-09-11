---
"effect": patch
---

Stop `HttpServerResponse.toWeb` from passing a body into the Web `Response` constructor for status 204, 205, and 304. Node/undici rejects those statuses when a body is present; empty and `{ withoutBody: true }` already worked.
