---
"effect": minor
---

`sql.insert` and `sql.updateValues` now require a non-empty array of rows at the type level. Narrow array inputs with `Array.isReadonlyArrayNonEmpty` before passing them to these helpers.
