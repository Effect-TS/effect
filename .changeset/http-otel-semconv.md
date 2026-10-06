---
"effect": patch
"@effect/opentelemetry": patch
---

Align HTTP tracing with the OpenTelemetry HTTP semantic conventions. Span names default to the request method. Client 4xx and 5xx responses mark the span as an error without failing the response effect, and server 4xx responses no longer mark the span as an error. Server addresses, ports and unknown methods are normalized, URL credentials and signed query values are redacted, and header capture is opt-in through `TracerHeaderFilter`. `@effect/opentelemetry` exports homogeneous primitive arrays as array attributes instead of JSON strings.
