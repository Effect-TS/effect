---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Redact sensitive query values in HTTP spans, request inspection and error messages. Also redact URL credentials in client spans, request inspection and errors. Request URLs sent over the wire are unchanged.

Move `AWSAccessKeyId`, `Signature`, `sig` and `X-Goog-Signature` from `Headers.CurrentRedactedNames` to the new `UrlParams.CurrentRedactedNames`. A custom list replaces these defaults. Add `UrlParams.isRedactedName`, `UrlParams.redact` and `UrlParams.redactUrl` for explicit redaction.
