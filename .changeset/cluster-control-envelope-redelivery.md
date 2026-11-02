---
"effect": patch
---

Fix cluster runners restarting an active uninterruptible persisted request each time the storage claim of its interrupt expired. Interrupts and acks read again from storage are now delivered once to a running request, and the in-memory message storage keeps them until the request replies, like the SQL storage, so a cancellation survives a runner restart.
