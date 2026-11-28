---
"@effect/platform-node-shared": patch
---

Fix `layerProxyProcess` stopping a healthy proxy process when a blocked event loop delays reading a queued reply past `responseTimeout`.
