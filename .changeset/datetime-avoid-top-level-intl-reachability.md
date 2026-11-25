---
"effect": patch
---

Importing `Effect` or `Schedule` no longer makes AOT compilers such as `scriptc` require `Intl`; `Schedule.cron` still needs it.
