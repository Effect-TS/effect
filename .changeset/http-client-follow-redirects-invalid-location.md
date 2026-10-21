---
"effect": patch
---

Fix `HttpClient.followRedirects` dying on an invalid `Location` header; it now returns the redirect response unchanged.
