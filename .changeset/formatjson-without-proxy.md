---
"effect": patch
---

Let `Formatter.formatJson`, and so `Cause.pretty`, format values with own getters on engines without `Proxy` instead of throwing a `ReferenceError`.
