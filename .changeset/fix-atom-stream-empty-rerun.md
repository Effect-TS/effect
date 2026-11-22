---
"effect": patch
---

Fix stream `Atom`s settling as `Success` on empty completion with a prior, seeded, or `initialValue` value; they now fail with `NoSuchElementError` and keep `previousSuccess`.
