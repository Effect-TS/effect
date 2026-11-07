---
"effect": patch
---

Surface a defect from a tool handler's finalizer as a failure when `Toolkit` stops the handler early, instead of discarding the interrupted fiber's exit.
