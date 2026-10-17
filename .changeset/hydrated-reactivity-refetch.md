---
"effect": patch
---

Keep non-`Initial` hydrated values and registry `initialValues` for effect and stream atoms instead of running them on mount. Because their dependencies are not known yet, the first registry write conservatively runs each skipped atom once.
