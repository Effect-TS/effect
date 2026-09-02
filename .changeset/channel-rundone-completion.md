---
"effect": patch
---

Fix `Channel.runDone` to consume all output and return the channel's completion value instead of its first emitted element, ensuring later effects run and later failures propagate.
