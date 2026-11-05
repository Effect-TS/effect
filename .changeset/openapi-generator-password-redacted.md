---
"@effect/openapi-generator": minor
---

Generate `Redacted` fields for `format: "password"` strings.

The `httpclient` and `httpapi` formats now generate `Schema.Redacted(Schema.String)` with the `Redacted.Redacted<string>` type for password fields, in both the schema type and its encoded type. Generated `httpclient` operations whose params or payload contain a password encode them before sending the request, so the real value is sent instead of `<redacted>`. Multipart payloads unwrap their top-level `Redacted` fields. Other operations are generated as before. The `httpclient-type-only` format keeps `string`.

To migrate, pass password values to generated clients with `Redacted.make`, and read decoded password values with `Redacted.value`. To keep plain strings, remove `format: "password"` with the generator's `onEnter` hook or an OpenAPI patch.
