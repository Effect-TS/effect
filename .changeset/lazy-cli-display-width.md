---
"effect": patch
---

Avoid the startup cost of `Intl.Segmenter` for CLI commands that never measure text width.
