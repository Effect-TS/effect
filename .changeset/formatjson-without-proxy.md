---
"effect": patch
---

Stop `Formatter.formatJson`, and so `Cause.pretty`, from depending on `Proxy`, so values with own getters format and redact on engines without it instead of throwing a `ReferenceError`.
