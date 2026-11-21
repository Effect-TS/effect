---
"effect": patch
---

Add RFC 8288 `Link` header support: `Headers.parseLink`, `Headers.formatLink`, `Schema.LinkHeaderFromString`, `HttpClientResponse.links` and `link`, plus `Headers.append`, `HttpClientRequest.appendHeader` and `HttpServerResponse.appendHeader` for adding to a header without replacing it.
