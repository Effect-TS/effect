---
"effect": patch
---

SchemaRepresentation: compare container slots structurally when two ASTs carry the same annotations object, so a derivation of a context-only copy (e.g. the JSON codec of a schema containing `Unknown` reused with `HttpApiSchema.status`) no longer publishes duplicate components for one declared identifier
