---
"@effect/platform-node-shared": patch
---

With `NodeChildProcessSpawner.layerProxyProcess`, a failed write to a duplex additional fd is now reported to a later reader of that fd, even when the child closed the fd right after starting.
