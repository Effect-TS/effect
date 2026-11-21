---
"effect": patch
"@effect/openapi-generator": patch
---

Generated `httpclient-type-only` clients used to skip lines like `data:42` because they expected a space after `data:`. They also tried to parse each data line as separate JSON. The client now accepts lines with or without the space, joins all data lines in an event, and delivers the event at the next blank line.

For an operation exported by `OpenApi.fromApi`, the old client returned just the parsed data. For example, `data: 42` produced the number `42` even though the generated type promised an event object. The client now returns `{ event: "message", data: "42" }`. When the OpenAPI schema describes just the JSON payload, the client returns `42` and reports malformed JSON as a decode error.

With `Sse.decode()`, a line such as `retry: 1000` ends the stream with a `Retry` failure. Use `Sse.decodeAnyEvent()` to receive the hint as a value and keep reading from the same connection.
