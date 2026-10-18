---
"effect": patch
---

Generate EventLog entry ids from a hybrid logical clock, so a local write always sorts after every committed entry the process has seen, even when the local clock is behind.

- The memory, IndexedDB and SQL journals advance the entry id clock past each remote entry they import.
- The IndexedDB and SQL journals also read the latest stored id before each local write, because other tabs or processes sharing the store keep their own clock. This adds one read per `writeMany`.
- Clocks that run ahead are not clamped. A warning is logged when an observed id is more than 24 hours ahead of the local clock.
