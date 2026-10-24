---
"effect": patch
---

Fix `Exit.hasFails`, `Exit.hasDies`, `Exit.hasInterrupts`, and `AsyncResult.isInterrupted` narrowing away every failure when they return `false`. They now return `boolean`, like the matching `Cause` checks; use `Exit.isFailure` or `AsyncResult.isFailure` to narrow.
