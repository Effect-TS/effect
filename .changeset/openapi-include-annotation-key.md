---
"effect": patch
---

Add an `includeAnnotationKey` option to `OpenApi.fromApi` that selects custom schema annotation keys, such as `x-*` vendor extensions, to include in the generated OpenAPI schemas. It mirrors the `Schema.toJsonSchemaDocument` option of the same name, which `fromApi` previously did not forward.
