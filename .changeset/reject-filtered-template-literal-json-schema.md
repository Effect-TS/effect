---
"effect": patch
---

`Schema.toJsonSchemaDocument` now throws `Unsupported TemplateLiteral part with checks` for template literals whose segments have checks, instead of silently dropping the segment constraint. Named segments (with an `identifier`) are now resolved and handled the same way as unnamed ones.
