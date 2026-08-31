---
"effect": patch
---

PersistedQueue hardening pass.

- `maxAttempts` and a new `backoff` option move from `take()` to `PersistedQueue.make()`. Attempts are now counted when an element is claimed, so handler metadata is 1-based and a crash on the final attempt still dead-letters instead of redelivering forever.
- Failed elements get a retry backoff (capped exponential by default) via a new `visible_at` column, and exhausted elements are marked `failed` instead of becoming invisible. Elements whose stored payload no longer decodes are dead-lettered immediately and skipped; schema decode errors leave `take`'s error channel.
- Completed elements are retained for de-duplication and pruned by a new `PersistedQueueStore.cleanup` method plus `PersistedQueue.layerCleanup({ interval, timeToLive, failedTimeToLive })`. Failed elements are kept unless `failedTimeToLive` is set.
- `complete`/`retry` acknowledgements now retry up to the lock expiration window instead of dying after ~1s of store downtime.
- Schema fixes: 64-bit `sequence` on all dialects, `id`/`queue_name` widened to 255 chars, MySQL `element` is `MEDIUMTEXT`, and pollers use a partial index on pending rows where supported. The `0001_create_table` migration is edited in place since the module is unstable.
- `offer` nudges local pollers so same-process work skips the poll interval, the memory store take race and unbounded Redis dedupe set are fixed, and Redis/memory stores now mirror the SQL semantics.
