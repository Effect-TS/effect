---
"effect": patch
---

Skip `LayerMap` preloading for keys with a zero idle TTL. With the default TTL, `preloadKeys` and `preload: true` no longer acquire resources during construction; failures from those resources surface on first use instead of during construction. Set a non-zero `idleTimeToLive` to retain eager validation and preload resources until their idle TTL expires.
