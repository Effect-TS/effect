---
"effect": patch
---

Accept `Redacted` values as URL parameters in `UrlParams` and `HttpClientRequest`. The value is sent unwrapped but stays redacted in inspection, JSON output, `HttpClientError`, `AiError` request details and the HTTP client's `url.full` and `url.query` span attributes.

`UrlParams.params` and iteration now yield `string | Redacted.Redacted` values. Getters such as `getFirst` and `toRecord` still return strings.

The runtime error that an `HttpClientError` carries as its cause, such as a Deno or Bun fetch error, may still contain the full URL.
