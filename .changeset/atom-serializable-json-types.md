---
"effect": minor
---

Fix `Atom.Serializable` to encode to and decode from `Schema.Json`, matching the JSON codec used by `Atom.serializable`. Encoded results may now require narrowing; runtime behavior is unchanged.
