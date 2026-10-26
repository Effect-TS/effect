---
"effect": patch
---

Keep the caller's stack frames in errors created with `Schema.Error.make` and `Schema.TaggedError.make`.

Interpreted `Class.make` now validates the fields first and constructs the instance outside the parser, so the default stack budget is no longer spent on parser frames. Classes with a compiled constructor still construct through the compiler.
