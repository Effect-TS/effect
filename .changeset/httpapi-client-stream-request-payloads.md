---
"effect": patch
---

Support `HttpApiSchema.StreamUint8Array` request payloads in `HttpApiClient`

Previously, declaring an endpoint with `payload: HttpApiSchema.StreamUint8Array()` type-checked (the client accepted a `Stream<Uint8Array>`), but the payload encoder had no stream case and fell back to Json encoding, sending `JSON.stringify(stream)` — the literal body `null` — over the wire. Stream payload schemas are now preserved through endpoint construction and encoded as streamed request bodies with the schema's content type.
