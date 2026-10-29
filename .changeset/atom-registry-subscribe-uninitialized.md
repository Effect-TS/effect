---
"effect": patch
---

Fix `AtomRegistry.subscribe` without `immediate` never notifying for an atom that has not been read yet. Subscribing now builds the atom, so the listener hears later changes. This also fixes `get.subscribe`, `get.stream` with `withoutInitialValue`, and `useAtomSubscribe` in `@effect/atom-react`.

A failed build no longer makes `subscribe` throw: the next read reports the failure, and the listener hears the recovery. An error thrown by a failed build's finalizer no longer aborts the next build; it is reported once that build has its value.
