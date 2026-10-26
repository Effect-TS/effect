---
"@effect/atom-react": patch
---

Defer notifications from atoms set while React reads an atom during render, so initializing an atom that sets another atom no longer updates other components during render.
