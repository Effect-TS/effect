---
"@effect/platform-node-shared": patch
---

Fix `NodeChildProcessSpawner.layerProxyProcess` sometimes losing a failed write to a duplex additional fd that the child had closed, so a later read of that fd now fails instead of ending cleanly.
