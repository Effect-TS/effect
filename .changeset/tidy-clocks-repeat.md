---
"effect": patch
---

Fix `DateTime.startOf`, `endOf` and `nearest` moving a zoned `DateTime` to the other occurrence of a repeated DST hour, and calendar-unit `endOf` returning an instant an hour early when the period ends in a repeated hour.
