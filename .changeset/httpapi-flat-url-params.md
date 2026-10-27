---
"effect": patch
---

Reject nested objects in `HttpApiClient` query parameters, GET payloads and form-urlencoded payloads, including `urlBuilder`, instead of sending bracket keys the server does not read. Use `Schema.fromJsonString` for structured URL parameter values.
