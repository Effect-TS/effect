---
"effect": patch
---

Mask interruption before invoking scope finalizer callbacks so singleton cleanup completes when its callback interrupts the closing fiber.
