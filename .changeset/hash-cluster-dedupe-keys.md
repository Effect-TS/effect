---
"@effect/cluster": patch
---

Backport upstream SQL message deduplication handling by hashing composed keys longer than 255 characters while preserving short and legacy SQLite keys.
