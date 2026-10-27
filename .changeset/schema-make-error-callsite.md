---
"effect": patch
---

Keep caller stack frames in errors created with `Schema.Error.make` and `Schema.TaggedError.make`, including when only a decoder is registered.
