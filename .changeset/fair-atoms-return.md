---
"effect": patch
---

Discard pending Atom.searchParam writes when browser history navigates, so a debounced update cannot overwrite the destination query.
