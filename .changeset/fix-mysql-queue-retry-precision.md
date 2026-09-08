---
"effect": patch
---

Preserve sub-second MySQL persisted queue retry delays using microsecond timestamps and intervals. Migrate existing queue timestamp columns to retain fractional precision.
