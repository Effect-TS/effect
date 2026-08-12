---
"@effect/platform": patch
---

Fix `HttpApiBuilder` to parse request bodies with structured JSON content types (RFC 6838 `+json` suffix) as JSON instead of `Uint8Array`. Custom JSON content types like `application/scim+json` and `application/vnd.api+json` now decode correctly on the server when used with `HttpApiSchema.withEncoding({ kind: "Json", contentType: "..." })`.
