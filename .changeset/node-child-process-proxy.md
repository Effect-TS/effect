---
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
---

Add `NodeChildProcessSpawner.layerProxyProcess`, which launches commands from a small proxy process so spawning no longer stalls the event loop of a large Node.js application.
