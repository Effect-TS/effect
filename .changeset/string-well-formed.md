---
"effect": patch
---

Add `String.isWellFormed` and `String.toWellFormed`, which check for and replace unpaired UTF-16 surrogates with the native ES2024 methods when the runtime has them.
