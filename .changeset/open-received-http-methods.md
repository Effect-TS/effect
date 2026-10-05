---
"effect": minor
---

`HttpServerRequest.method` and `HttpClientRequest.method` are now typed as `string` instead of `HttpMethod`, because requests received from or converted to Web requests can carry methods outside the known literals (for example `PROPFIND`). `HttpClientRequest.makeWith` and `AiError.HttpRequestDetails.method` accept any method string, and `HttpMethod.hasBody` gains a `string` overload. Code that exhaustively matches on these properties needs a fallback case, or should narrow with `HttpMethod.isHttpMethod`.
