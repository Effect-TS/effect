---
"effect": patch
---

Make `HttpServerResponse.toWeb` keep the outer status and statusText when the raw body is already a Web `Response`. Headers from the Effect response still overlay the inner headers; the inner body is reused.
