---
"effect": patch
---

Add `LinkHeader` for parsing and formatting RFC 8288 `Link` headers, `HttpClientResponse.links` and `link` for reading resolved links, and `Headers.append`, `HttpServerResponse.appendHeader` and `HttpClientRequest.appendHeader` for adding to a header without replacing it.
