---
"@effect/platform-node": patch
---

`NodeHttpClient.layerNodeHttp` now encodes `FormData` request bodies with the global `Response`, so it no longer loads the `undici` package. Bundles that use the `node:http` client no longer include undici. File contents are still streamed as the upload needs them, and a file that cannot be read still fails the request with a `TransportError`. The Undici-backed client is unchanged.
