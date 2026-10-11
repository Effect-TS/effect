---
"effect": patch
---

Fix `DateTime.add` and `DateTime.subtract` on zoned values so hours, minutes, seconds and milliseconds are elapsed time across DST transitions, instead of wall-clock time that could skip or repeat an hour.
