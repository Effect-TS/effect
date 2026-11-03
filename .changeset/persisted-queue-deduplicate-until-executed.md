---
"effect": patch
---

Add a `deduplicate` option to `PersistedQueue` `offer`. The default `"untilRemoved"` keeps the current behaviour, where a custom id stays reserved until its element is removed from the store. With `"untilExecuted"`, the id is released once its element completes or fails its final attempt, so a later offer enqueues new work. Offers made while the element is pending, processing or waiting to retry are still coalesced.
