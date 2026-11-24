---
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
---

Add `NodeChildProcessSpawner.layerProxyProcess`, which launches commands from a small proxy process, for Node.js builds where spawning from a process holding a lot of memory stalls the event loop.
