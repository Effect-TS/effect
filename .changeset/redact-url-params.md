---
"effect": patch
---

Redact sensitive query parameter values in HTTP span attributes, inspect output and error messages.

Add `UrlParams.CurrentRedactedNames`, `UrlParams.isRedactedName` and `UrlParams.redact`. Matching parameter values are recorded as `REDACTED` in `url.full` and `url.query` on client and server spans, and rendered as `Redacted` when `UrlParams`, `HttpClientRequest` or `HttpServerRequest` values are inspected. `HttpClientError` and `HttpServerError` messages redact them too. Client spans now replace URL userinfo with `REDACTED:REDACTED`, matching server spans. The URL sent over the wire is unchanged.

The query parameter names `AWSAccessKeyId`, `Signature`, `sig` and `X-Goog-Signature` moved from `Headers.CurrentRedactedNames` to `UrlParams.CurrentRedactedNames`. `Headers.CurrentRedactedNames` now defaults to `authorization`, `cookie`, `set-cookie` and `x-api-key`.
