---
"effect": patch
---

Skip startup stack probing when `Error.stackTraceLimit` is zero, avoiding unnecessary stack formatting during module loading.
