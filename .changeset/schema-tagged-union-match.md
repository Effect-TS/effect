---
"effect": patch
---

Fix `Schema.TaggedUnion.match` and `matchOrElse` return inference and handler input types, and narrow `matchOrElse` fallbacks to unhandled variants.

Remove explicit output type arguments from `Schema.TaggedUnion.match` and `matchOrElse` calls; annotate handler return types when an explicit output is needed.
