---
"effect": patch
---

Fix stream `Atom`s settling as `Success` when completing without emitting; they now fail with `NoSuchElementError` and keep `previousSuccess`.
