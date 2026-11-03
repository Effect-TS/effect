---
"effect": patch
---

Add a `deduplicate: "untilExecuted"` option to `PersistedQueue` `offer`, which lets a custom id be offered again once its element completes or fails its final attempt.
