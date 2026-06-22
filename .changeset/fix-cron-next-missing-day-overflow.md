---
"effect": patch
---

Fix `Cron.next` skipping earlier matching days when the upcoming day-of-month does not exist in the current month. For an expression like `0 0 1,16,31 * *`, advancing from a date past the 16th selected day 31; in a month without 31 days this overflowed into the following month and landed on a later matching day (e.g. the 16th), silently skipping the 1st. `Cron.next` now wraps to the first matching day of the next month in that case, matching the behaviour of `Cron.prev` and other cron implementations.
