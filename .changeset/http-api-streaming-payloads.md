---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/openapi-generator": patch
---

Add streaming request payloads to `HttpApi`. An endpoint can declare `HttpApiSchema.StreamUint8Array` or the new `HttpApiSchema.StreamNdjson({ schema })` as its `payload`, and the handler receives a lazy `Stream` that reads the body as it pulls. Bad NDJSON lines fail the stream with `HttpApiSchemaError` (400). The new `maxBytes` and `maxElementBytes` limits fail it with the new `HttpApiPayloadTooLarge` (413), and a `content-length` over `maxBytes` is rejected before the handler runs. `StreamNdjson` also works as a success response.

`HttpApiClient` sends a `Stream` payload without buffering it and infers the stream's requirements. `HttpApiTest` passes stream payloads through unbuffered. `OpenApi.fromApi` marks streaming request bodies with `x-effect-stream`, and `openapi-generator` maps them, and NDJSON or JSON Lines bodies with an `itemSchema`, back to `StreamUint8Array` and `StreamNdjson`.

The Node server drains up to 256 KiB of a body the handler left unread, then closes the connection, instead of reading the whole upload or leaving the socket stuck.
