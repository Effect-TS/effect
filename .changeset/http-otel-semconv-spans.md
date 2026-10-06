---
"effect": patch
"@effect/opentelemetry": patch
---

HTTP client and server spans now follow the OpenTelemetry HTTP semantic conventions.

Default span names are now the request method, for example `GET` instead of `http.client GET` or `http.server GET`. Methods the conventions don't define use the span name `HTTP` and record `http.request.method` as `_OTHER`, with the original value in `http.request.method_original`. Update dashboards, alerts or samplers that match the old names, or provide `HttpClient.SpanNameGenerator` / `HttpMiddleware.SpanNameGenerator` to keep them.

Client spans for 4xx and 5xx responses now end as errors and record `error.type`. The response effect still succeeds. Server spans for handled 4xx responses no longer end as errors.

`server.address` is now the host name rather than the URL origin. `server.port` falls back to the scheme's default port, and server spans read both from the `Host` header. URL credentials are recorded as `REDACTED:REDACTED`. The values of the `AWSAccessKeyId`, `Signature`, `sig` and `X-Goog-Signature` query parameters are recorded as `REDACTED`.

Request and response headers are no longer recorded by default. To opt in, provide a filter through `HttpClient.TracerHeaderFilter` or the new `HttpMiddleware.TracerHeaderFilter`.

`@effect/opentelemetry` now exports arrays whose elements are all strings, all numbers or all booleans as array attributes on spans and logs. Other arrays are still exported as JSON strings.
