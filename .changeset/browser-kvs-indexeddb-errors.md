---
"@effect/platform-browser": patch
---

Report IndexedDB open failures and synchronous IndexedDB exceptions as `KeyValueStoreError` in `BrowserKeyValueStore.layerIndexedDb` instead of defects.
