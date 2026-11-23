---
"effect": patch
---

Fix `FetchHttpClient` ignoring a `globalThis.fetch` replaced after its first request when `FetchHttpClient.Fetch` is not provided.
