---
"effect": patch
---

Add the unstable `effect/eventlog/EventRow` module for convergent row updates with `set`, `patch` and `remove` events. It supports single-field, composite and derived keys, per-field conflict resolution through typed storage callbacks, and compaction that drops superseded entries.
