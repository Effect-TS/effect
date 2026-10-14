---
"effect": patch
---

Accept `Redacted` values as URL parameters in `UrlParams` and `HttpClientRequest`. The value is sent unwrapped, but `toJSON`, inspection, the request inside an `HttpClientError` and the HTTP client's `url.full` and `url.query` span attributes render it redacted. The runtime's own error that an `HttpClientError` carries as its cause, such as a Deno or Bun fetch error, may still contain the full URL.
