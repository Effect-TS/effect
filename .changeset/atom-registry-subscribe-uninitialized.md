---
"effect": patch
---

Fix `AtomRegistry.subscribe` without `immediate` never notifying for an atom that has not been read yet; the atom is now built when it gains a listener.
