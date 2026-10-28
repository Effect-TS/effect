---
"effect": patch
---

Fix `HttpClient.followRedirects` keeping `Content-Encoding`, `Content-Language` and `Content-Location` headers on redirects that switch the request to GET.
