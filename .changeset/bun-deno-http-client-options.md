---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add `BunHttpClient.layerOptions` and `DenoHttpClient.layerOptions` for typed Unix socket and TLS settings using each runtime's native fetch options. `DenoHttpClient.makeClient` acquires a scoped `Deno.HttpClient`. The Bun and Deno Kubernetes HTTP client layers now use these helpers instead of casts.
