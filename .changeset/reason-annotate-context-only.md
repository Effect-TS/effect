---
"effect": patch
---

Type `Cause.Reason#annotate` as accepting a `Context` only.

The declaration also allowed a `ReadonlyMap`, but the implementation reads `annotations.mapUnsafe` and
throws on one. The standalone `Cause.annotate` was already `Context`-only.
