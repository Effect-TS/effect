---
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
---

Add `NodeChildProcessSpawner.layerProxyProcess`, which launches commands from a small proxy process, for Node.js builds where spawning from a process holding a lot of memory stalls the event loop. The layer also provides `NodeChildProcessSpawner.ProxyProcess`, which reports the proxy process ID, and packaged applications can run the proxy process from their own entry point with `NodeChildProcessProxy.run`.
