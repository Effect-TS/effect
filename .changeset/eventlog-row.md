---
"effect": patch
---

Add the unstable `effect/eventlog/EventRow` module for convergent mutable rows. `make` derives `set`, `patch` and `remove` payloads from a row schema, keyed by one field or by several fields with an optional derivation, for use with `EventGroup.add` and existing EventLog writes. `handler` resolves conflicts per top-level field and calls at most one typed storage callback, and `compaction` drops row entries that newer ones shadow.
