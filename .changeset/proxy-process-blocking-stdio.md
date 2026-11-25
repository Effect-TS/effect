---
"@effect/platform-node-shared": patch
---

Fix `NodeChildProcessSpawner.layerProxyProcess` leaving additional file descriptors (fd 3 and above) in non-blocking mode.
