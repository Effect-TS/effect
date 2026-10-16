---
"effect": patch
---

Fix Cause runtime JSON and inspection output to use `reasons` instead of `failures`, including within failed Exits. Schema validation error paths now also use `reasons`; Cause and Exit schema encodings are unchanged.
