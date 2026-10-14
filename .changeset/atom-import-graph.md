---
"effect": minor
---

Importing `Atom` or `AsyncResult` no longer loads Schema or `KeyValueStore`.

### Breaking changes

Move `Atom.kvs` to `AtomKvs.kvs`, `Atom.searchParam` to `AtomSearchParam.searchParam`, `Atom.serializable` to `AtomSerializable.serializable`, and `AsyncResult.Schema` to `AsyncResultSchema.Schema`.
