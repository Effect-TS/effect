---
"effect": patch
---

Fix `Exit.hasFails`, `Exit.hasDies`, `Exit.hasInterrupts`, and `AsyncResult.isInterrupted` narrowing away every failure when they return `false`.
