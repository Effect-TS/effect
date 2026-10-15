---
"effect": patch
"@effect/platform-browser": patch
---

Isolate `Persistence` stores on the `KeyValueStore` and Redis backings. Clearing a store now only removes that store's entries, and different store / key pairs no longer map to the same backing key.

Add `KeyValueStore.clearPrefix`, implemented by the memory, file system, SQL, Web Storage and IndexedDB stores. `KeyValueStore.prefix(...).clear` now only removes keys under the prefix. Stores built with `KeyValueStore.make` that don't provide `clearPrefix` fail for non-empty prefixes instead of clearing everything.

Both backings now store entries under `<storeId>:<key>`, with `%` and `:` in the store id percent-encoded.

**Key layout change.** Entries written by earlier versions are not read back:

- `Persistence.layerKvs` / `layerBackingKvs`: every existing entry becomes unreachable, because keys used to be `<storeId><key>` with no separator. Cached results are recomputed. `Chat.layerPersisted` on a `KeyValueStore` backing loses its stored chat histories.
- `Persistence.layerRedis` / `layerBackingRedis`: keys are unchanged unless the store id contains `%` or `:`. Entries for those store ids become unreachable.

Old entries are not migrated or removed automatically.
