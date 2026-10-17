---
"effect": patch
---

Give defects precedence when the runtime combines a typed failure with a defect, so typed-error recovery can no longer swallow a crashing finalizer or a dying concurrent sibling.
