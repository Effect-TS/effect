---
"@effect/platform-node": patch
---

Decode Node HTTP request and response text with `TextDecoder`, so a leading UTF-8 BOM no longer breaks `json` on the Node server and `NodeHttpClient.layerNodeHttp`.
