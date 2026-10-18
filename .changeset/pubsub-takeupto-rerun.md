---
"effect": patch
---

Fix a reused `PubSub.takeUpTo` effect taking fewer messages on later runs after it first drained replayed messages.
