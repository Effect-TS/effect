---
"@effect/platform-node-shared": patch
---

Prevent an uncaught error when a duplex stream's data listener closes the socket reader scope or interrupts a pending pull during a read.
