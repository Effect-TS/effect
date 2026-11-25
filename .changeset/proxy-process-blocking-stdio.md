---
"@effect/platform-node-shared": patch
---

Set piped stdio sockets to blocking mode in `NodeChildProcessSpawner.layerProxyProcess` before spawning commands so additional file descriptors (fd 3 and above) do not arrive in non-blocking mode.
