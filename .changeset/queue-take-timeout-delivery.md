---
"effect": patch
---

Prevent message loss when `Queue.take`, `takeAll`, `takeN`, `takeBetween`, `poll`, and `clear` are interrupted at a scheduler yield.
