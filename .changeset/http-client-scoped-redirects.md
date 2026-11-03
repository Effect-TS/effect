---
"effect": patch
---

Fix `HttpClient.followRedirects` losing `HttpClient.withScope` cancellation of redirected requests and response bodies.
