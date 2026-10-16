---
"@effect/platform-node": patch
---

Fix `NodeHttpClient.layerNodeHttp` and `layerUndici` leaving a request pending with an unhandled rejection when an `HttpBody.formData` file stream fails. The request now fails with a typed `HttpClientError` and releases its file streams and socket.
