---
"effect": patch
---

Declare `KeyFormat.JsonWebKey` instead of referencing the DOM library's global `JsonWebKey`, so `effect` declarations type-check with Node-only types.
