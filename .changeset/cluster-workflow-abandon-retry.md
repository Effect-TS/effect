---
"effect": patch
---

Fix a forced shard release stalling forever when a child workflow wakes its still-running parent. The wake's cluster abandonment was retried, so it waited on the retired run and blocked the shard from being reacquired. The abandonment now interrupts the wake, so the activation unwinds, the release completes, and the parent is resumed under the next owner.
