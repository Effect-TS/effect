---
"effect": patch
---

Compare committed `TxRef` values with `Object.is`. Setting `NaN` over `NaN` no longer increments the reference version, while `0` and `-0` are treated as distinct and do bump it.
