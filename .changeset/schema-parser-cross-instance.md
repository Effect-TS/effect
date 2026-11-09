---
"effect": patch
---

Fix Schema encoding and decoding of schemas created by another copy of `effect`, which could return an internal symbol instead of the input or reject a missing optional key; both copies must include this fix.
