---
"effect": patch
---

Fix `DateTime.startOf`, `endOf` and `nearest` around repeated DST hours. Sub-day rounding now keeps the input's offset, so it no longer jumps to the other occurrence of the hour, and calendar `endOf` now returns the last instant of the period.
