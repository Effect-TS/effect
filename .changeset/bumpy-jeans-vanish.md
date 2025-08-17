---
"@effect/platform-node": patch
"effect": patch
---

- When calling `annotations` on a schema, any previously existing identifier annotations are deleted.
- When calling `encodedBoundSchema` / `encodedSchema`, create an identifier annotations for suspended schemas
- fix 5061 `nullable: true` is not part of OpenAPI 3.1.
- fix 5364 Only the description of the first occurrence of a schema (as defined in $defs) gets included.
