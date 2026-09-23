---
"effect": patch
---

Add `HttpClientResponse.toWeb`, which returns the original Web `Response` backing a client response when the client exposes one.

The returned response keeps runtime-specific body capabilities that a stream rebuilt in JavaScript cannot carry. On workerd, `HttpClientResponse.toWeb(response)?.body` reports a known length to `R2Bucket.put`, while `Stream.toReadableStreamEffect(response.stream)` produces a rebuilt stream that does not.
