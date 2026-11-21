---
"effect": patch
---

Add RFC 8288 `Link` header support (`Headers.parseLink`, `Headers.formatLink`, `Schema.LinkHeaderFromString`, `HttpClientResponse.links`/`link`) and header-appending helpers (`Headers.append`, `HttpClientRequest.appendHeader`, `HttpServerResponse.appendHeader`).
