---
"effect": patch
"@effect/openapi-generator": patch
---

Generated `httpclient-type-only` clients now read complete server-sent events, including multiline data and `data:` lines without a space.

For APIs exported by `OpenApi.fromApi`, `data:42` now yields the declared event object `{ event: "message", data: "42" }`. An OpenAPI operation that describes only the JSON payload yields the number `42`.

`Sse.decodeAnyEvent()` lets callers read retry hints and continue receiving events on the same connection.
