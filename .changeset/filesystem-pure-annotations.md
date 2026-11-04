---
"effect": patch
---

Annotate the `glob` and `stream` constructors in `FileSystem.make` as pure, so bundlers can drop them when a `FileSystem` implementation's derived methods are unused.
