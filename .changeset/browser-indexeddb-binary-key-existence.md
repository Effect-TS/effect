---
"@effect/platform-browser": patch
---

Fix `has` in `BrowserKeyValueStore.layerIndexedDb` to recognize existing keys whose values are `Uint8Array`, including empty arrays and strings overwritten with bytes. String and binary reads retain their existing no-coercion behavior.
