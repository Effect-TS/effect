---
"effect": patch
---

Fix `AtomRegistry.subscribe` without `immediate` never notifying for an atom that has not been read yet. Subscribing now builds the atom, as it already did for a stale one, so the listener hears later changes. This also fixes `get.subscribe`, `get.stream` with `withoutInitialValue` and `useAtomSubscribe` in `@effect/atom-react` for an unread atom.

A build that fails while a listener is added no longer throws from `subscribe`: the listener still hears the atom recover, and the next read reports the failure. An error thrown by a finalizer of a failed build no longer aborts the next build, and is reported once that build has its value.
