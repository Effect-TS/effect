---
"effect": patch
---

`Formatter.formatJson`, used by the JSON loggers, no longer creates a property descriptor for every key it formats: values under holders without getters are read directly and getters are detected without a descriptor where the engine allows it.
