---
"effect": patch
---

Fix stream `Atom`s settling as `Success` with a stale, seeded, or `initialValue` value when a run completes without publishing; they now fail with `NoSuchElementError` and retain that value as `previousSuccess`.
