---
"@effect/openapi-generator": patch
---

Fix `--format httpapi` rewriting binary-format strings as multipart files in every component. Components used by JSON bodies now keep `Schema.String`, and a multipart body that references a shared component gets a `<Name>Multipart` copy instead.
