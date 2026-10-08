---
"effect": patch
"@effect/platform-node-shared": patch
---

Support duplex `additionalFds` through `getInputFd` and `getOutputFd`, preserving both directions when used with `pipeTo`.
