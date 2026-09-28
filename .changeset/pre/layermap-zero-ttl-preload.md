---
"effect": patch
---

Skip `LayerMap` preloading for keys with a zero idle TTL. With the default TTL, preload failures now surface on first use; set a non-zero `idleTimeToLive` to retain eager validation.
