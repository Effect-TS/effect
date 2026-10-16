---
"@effect/platform-node": patch
---

Send `HttpBody.formData` request bodies from `NodeHttpClient.layerUndici` as streamed `multipart/form-data` with a boundary `content-type`. Previously undici did not recognize Node's global `FormData`, so the request was never sent and the Effect hung.
