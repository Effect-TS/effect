---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Redact sensitive query parameter values in HTTP span attributes, inspect output and error messages.

Add `UrlParams.CurrentRedactedNames`, `UrlParams.isRedactedName`, `UrlParams.redact` and `UrlParams.redactUrl`. Matching parameter values are recorded as `REDACTED` in `url.full` and `url.query` on client and server spans, and rendered as `Redacted` when `UrlParams`, `HttpClientRequest` or `HttpServerRequest` values are inspected, including the Node, Bun and Deno server requests. `HttpClientError` and `HttpServerError` messages redact them too. Client spans now replace URL userinfo with `REDACTED:REDACTED`, matching server spans. The URL sent over the wire is unchanged.

The query parameter names `AWSAccessKeyId`, `Signature`, `sig` and `X-Goog-Signature` moved from `Headers.CurrentRedactedNames` to `UrlParams.CurrentRedactedNames`. `Headers.CurrentRedactedNames` now defaults to `authorization`, `cookie`, `set-cookie` and `x-api-key`.
