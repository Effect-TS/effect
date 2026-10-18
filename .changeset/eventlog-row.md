---
"effect": patch
---

Add the unstable `effect/eventlog/EventRow` module for mutable rows that converge across EventLog replicas without hand-written last-writer-wins stamps.

- `EventRow.make(tag, { key, schema, error? })` defines a row type as one event, with a `set | patch | remove` payload derived from a `Schema.Struct`. It returns the options `EventGroup.add` takes, plus `set`, `patch` and `remove` payload constructors for `EventLog.write` and `writeMany`.
- `EventRow.handler(row, { set, patch, remove })` resolves conflicts with per-field last-writer-wins and calls at most one callback with typed values.
