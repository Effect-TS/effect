---
"effect": patch
---

Publish SQL unencrypted event-log changes only after a successful storage transaction commit, preventing missed startup rows and notifications for rolled-back writes.
