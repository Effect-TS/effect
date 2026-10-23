---
"effect": patch
---

Emit smaller declarations for exported `Data.taggedEnum` constructors by returning the named `Data.TaggedEnum.Constructor` and new `Data.TaggedEnum.GenericConstructor` types instead of expanded anonymous objects.

Libraries that export a generic tagged enum and are built against this version emit `Data.TaggedEnum.GenericConstructor` in their declarations, so their consumers need `effect` 4.0.7 or later.
