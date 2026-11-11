---
"effect": patch
---

Shrink `Arbitrary` string counterexamples by deleting characters anywhere, and defer shrinking work until a property fails. Existing string replay tokens may need to be recorded again.
