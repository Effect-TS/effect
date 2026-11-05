---
"effect": minor
---

Map JSON Schema `format: "password"` strings to `Redacted` values.

`SchemaRepresentation.fromJsonSchemaDocument` and `fromJsonSchemaMultiDocument` now import password strings as `Schema.RedactedFromValue(Schema.String)`, so they decode to `Redacted` values and encode back to the plain string. Other annotations and constraints, such as `minLength`, apply to the inner string. Nullable password strings decode their string values the same way. Property names, and password strings constrained by `enum` or `const`, stay plain strings. An open object whose properties contain a password now imports as a closed struct, so additional properties are stripped instead of retained.

`Schema.toJsonSchemaDocument`, and the OpenAPI documents generated from `HttpApi`, now emit `format: "password"` for `Schema.Redacted` and `Schema.RedactedFromValue` when they wrap a string schema without its own `format`, including formats supplied by checks such as `Schema.isUUID`.

To migrate, read imported password values with `Redacted.value`, and wrap values with `Redacted.make` before encoding them. To keep plain strings, remove `format: "password"` from the document before importing it, for example with the `onEnter` option.
