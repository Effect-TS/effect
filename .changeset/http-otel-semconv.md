---
"effect": patch
"@effect/opentelemetry": patch
---

Align HTTP client and server spans with the OpenTelemetry HTTP semantic conventions. Span names default to the request method, client 4xx and 5xx responses mark the span as an error, server 4xx responses leave it unset, `error.type`, `server.address`, `server.port` and `_OTHER` methods follow the spec, credentials and signed query values are redacted from URLs, and header attributes are now opt-in through `TracerHeaderFilter` on both client and server. `@effect/opentelemetry` now exports homogeneous primitive array attributes as arrays instead of JSON strings.
