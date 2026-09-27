---
"effect": patch
---

Fix `Number.remainder` for decimal operands whose scaled coefficients exceed the safe integer range, preserving the exact value of integer operands. This also prevents `Schema.isMultipleOf` from accepting or rejecting large values incorrectly.
