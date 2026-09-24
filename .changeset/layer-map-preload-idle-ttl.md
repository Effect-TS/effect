---
"effect": patch
---

Release LayerMap preload references after acquisition so entries follow their idle TTL instead of remaining pinned until map closure. Skip preloading when the idle TTL is zero (including the default). To keep preloaded entries for the lifetime of the map, set `idleTimeToLive: Infinity`.
