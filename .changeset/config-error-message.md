---
"effect": patch
---

Keep `ConfigError.message` readable when its `cause` is later replaced or copied, as test runners do when they serialize an error. The message is now computed once, when the error is made.
