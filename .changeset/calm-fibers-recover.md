---
"effect": patch
---

Fix a stack overflow when many consecutive failure handlers throw synchronously. The thrown defect is now captured as the fiber's exit and pending finalizers still run.
