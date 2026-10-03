---
"effect": patch
---

Fix zoned DateTime conversion on runtimes that omit Intl fractional seconds, preserving milliseconds for pre-epoch timestamps.
