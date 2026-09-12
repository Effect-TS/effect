---
"effect": patch
---

Restrict `ByteSize.Input` strings to canonical non-negative integers with recognized units, rejecting malformed literals at compile time. Parse external strings and fractional quantities with `ByteSize.fromString` or `ByteSize.fromStringUnsafe` before passing them to APIs accepting `ByteSize.Input`.
