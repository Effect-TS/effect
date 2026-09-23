---
"effect": patch
---

Reduce retained memory per fiber by moving the type brand to the prototype, avoiding bound callback registrations, and releasing join observers without storing per-fiber cancel closures for built-in fibers.
