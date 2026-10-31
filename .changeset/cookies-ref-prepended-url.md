---
"effect": patch
---

Fix `HttpClient.withCookiesRef` not sending cookies when the request URL is completed after it, for example by the `baseUrl` of `HttpApiClient`. Cookies are now selected for the final URL of each request, including redirect hops.
