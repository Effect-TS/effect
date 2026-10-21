---
"effect": patch
---

Add the unstable `effect/eventlog/EventRow` module for convergent row updates with `set`, `patch` and `remove` events. It supports single-field, composite and derived keys, per-field conflict resolution through typed storage callbacks, and compaction that drops superseded entries. The constructors return `{ event, payload }`, which spreads into `EventLog.write` and works as a `writeMany` item or client argument.

Breaking: the function returned by `EventLog.makeClient` now takes one `{ event, payload }` object instead of positional `event` and `payload` arguments.
