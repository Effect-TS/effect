---
"effect": patch
---

Fix `SchemaBinary` decoding so that reusing a Node.js `Buffer` leaves previously decoded byte fields intact.
