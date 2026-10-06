---
"effect": patch
---

Fix SQL unencrypted event-log notifications to publish in sequence order after commit, without missing startup rows or publishing rolled-back writes.
