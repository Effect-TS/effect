---
"effect": patch
---

Fix `Cron.prev` skipping the most recent occurrence when the input has a non-zero millisecond part, for example returning the previous day's midnight for `00:00:00.001`.
