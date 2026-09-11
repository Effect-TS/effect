---
"effect": patch
---

Optimize schema initialization by assigning constructor options directly.
`Schema.make` options must no longer use properties reserved by JavaScript
functions, such as `name`, `length`, `prototype`, or `__proto__`. Store custom
metadata under a different property name or in schema annotations.
