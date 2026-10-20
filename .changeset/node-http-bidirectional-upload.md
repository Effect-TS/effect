---
"@effect/platform-node": patch
---

Keep streaming request bodies uploading after `NodeHttpClient.layerNodeHttp` receives response headers, allowing bidirectional request and response streaming. Stop unfinished uploads when the response connection closes or the request is cancelled.
