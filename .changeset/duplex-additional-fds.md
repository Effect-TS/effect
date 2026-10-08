---
"effect": patch
"@effect/platform-node-shared": patch
---

Add `{ type: "duplex" }` to `ChildProcess` `additionalFds`, so a single extra file descriptor can be written with `getInputFd` and read with `getOutputFd`. A duplex descriptor targeted by `pipeTo` stays duplex. Half-close is supported on POSIX with Node.js, but not on Windows or Bun.
