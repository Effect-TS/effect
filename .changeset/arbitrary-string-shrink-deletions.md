---
"effect": patch
---

Shrink `Arbitrary` string counterexamples by deleting characters anywhere, not only at the end. A property that fails for any string with two spaces now shrinks to `"  "` instead of a long null-padded string. Pattern-constrained strings get pattern-checked deletions, and code-point-bounded strings delete and simplify whole code points. Replay tokens recorded for string counterexamples before this change may no longer apply.
