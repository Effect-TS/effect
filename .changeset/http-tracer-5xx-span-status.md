---
"effect": patch
---

Mark `HttpMiddleware.tracer` server spans as failed when the response status is 5xx, following the OpenTelemetry HTTP semantic conventions. Errors rendered into a response (for example an `HttpApi` error with a 500 status) previously ended the span successfully, so OTLP exporters recorded them with an `Ok` status.
