---
"effect": patch
---

Fix `FetchHttpClient` to resolve `globalThis.fetch` on each request instead of caching the first reference it sees.
