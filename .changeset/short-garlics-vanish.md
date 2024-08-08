---
"effect": minor
---

add `propagateInterruption` option to Fiber{Handle,Set,Map}

This option will send any external interrupts to the .join result.
