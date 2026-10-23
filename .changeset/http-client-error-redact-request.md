---
"effect": patch
---

Stop `HttpClientError` reasons from exposing request headers, query parameters and bodies when serialized or inspected. Their `toJSON` now prints the request as its method and redacted URL, and the response as its status, matching the error message. The full request and response remain available through the `request` and `response` properties.
