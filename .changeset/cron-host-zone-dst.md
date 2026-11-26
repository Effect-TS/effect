---
"effect": patch
---

Fix `Cron.next` and `Cron.prev` returning a time one hour off when a schedule without a time zone crosses a DST change in the host time zone.
