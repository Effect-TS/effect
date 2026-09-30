---
"effect": patch
---

Make `Schema.brand` type-only: brand identifiers are no longer stored in AST annotations or preserved by `SchemaRepresentation`. Reapply `Schema.brand` after rebuilding a representation when a branded TypeScript type is required; checks added by `Schema.fromBrand` remain preserved. Preserve the order of equal-priority union members that share an AST when deriving JSON and string-tree codecs.
