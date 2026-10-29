---
"effect": patch
---

Fix `HttpClient.withCookiesRef` never sending stored cookies when the request URL is completed after it, for example by `HttpClientRequest.prependUrl` or by the `baseUrl` of `HttpApiClient.make` with `transformClient: HttpClient.withCookiesRef(ref)`. Cookies are now selected when the request is sent, using its final URL. With `HttpClient.followRedirects` applied after `withCookiesRef`, same-origin redirect hops now get the stored cookies for their URL, including cookies set by the redirect response, and no stored cookies are sent after the chain crosses an origin.
