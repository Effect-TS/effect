---
"effect": patch
---

Fix pending interruptions being lost when an uninterruptible effect fails. When interruption skips recovery handlers, remove typed failures from the cause while preserving defects and interruption.
