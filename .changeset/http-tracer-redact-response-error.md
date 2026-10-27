---
"effect": patch
---

Redact the URL in the failure that `HttpMiddleware.tracer` records for 5xx responses when the response ends, so exporters that read the message later no longer see query values that were only redacted during the request.
