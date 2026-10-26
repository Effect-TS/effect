---
"effect": patch
---

Format values with own getters in `Formatter.formatJson` and `Cause.pretty` without `Proxy`, so engines that lack it no longer throw a `ReferenceError`. Getter results stay redacted on every engine.
