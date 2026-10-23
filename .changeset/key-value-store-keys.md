---
"effect": minor
"@effect/platform-browser": minor
---

Add `keys` to `KeyValueStore` and `SchemaStore`. It returns a snapshot of the keys in the store, in no particular order, and is implemented by the memory, file system, SQL, Web Storage and IndexedDB stores. Custom stores built with `KeyValueStore.make` or `KeyValueStore.makeStringOnly` must now provide `keys`.

`KeyValueStore.prefix(...)` now scopes `keys`, `size` and `isEmpty` to keys under the prefix, with the prefix removed from the returned keys. Previously `size` and `isEmpty` reported on the whole backing store.

Stores built with `KeyValueStore.make` that don't provide `clearPrefix` now derive it from `keys` and `remove` instead of failing for non-empty prefixes.
