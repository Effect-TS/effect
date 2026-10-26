---
"effect": patch
---

Add `HttpApiClient.decodeResponse` to decode a raw endpoint response with the endpoint's declared success and error schemas, for example after a `responseMode: "response-only"` call.
