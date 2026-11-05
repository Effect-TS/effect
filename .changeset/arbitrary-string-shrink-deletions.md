---
"effect": patch
---

Shrink `Arbitrary` strings by deleting characters anywhere, not only from the end. A property that fails for strings with two spaces now shrinks to `"  "` instead of a long run of `"\u0000"` characters around the spaces. Pattern-constrained and code-point-bounded strings get the same deletions. Replay tokens recorded for string counterexamples before this change may no longer apply.
