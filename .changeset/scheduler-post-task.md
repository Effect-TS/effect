---
"effect": patch
---

Improve runtime performance across scheduling, fibers, queues, pools, hash maps, and schema decoding:

- Use `scheduler.postTask` in browsers where available instead of clamped `setTimeout`, preserving uncaught-error reporting and falling back safely on missing or throwing scheduler globals, and avoid bucket array allocations on single default-priority scheduler turns.
- Speed up fiber yield/fork/join, `Context` service reads, `Effect.catchTag`/`catchCause`, `Queue.offer`/`Queue.take`, `Pool` fast paths and coalesced waiter wakes, `HashMap` lookups and node updates, and `Schema` struct/array decoding.
