---
"@effect/platform-node-shared": patch
---

NodePath: `layerPosix` and `layerWin32` now convert between paths and `file:` URLs using their own platform flavor instead of the host's, so `fromFileUrl` and `toFileUrl` agree with the rest of the layer when the host platform differs. Requires Node 22.1 or later, which is where `node:url` gained the `windows` option; on older runtimes both keep the previous host-flavored behavior. Closes #6913.
