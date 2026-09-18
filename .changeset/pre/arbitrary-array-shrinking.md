---
"effect": patch
---

Add `Arbitrary.array(item, { minLength, maxLength })` for variable-length arrays of custom Arbitraries. Shrinking removes blocks of commands while preserving the remaining values and their order, and also simplifies individual elements.

Schema-derived arrays now also try removing prefixes and interior blocks. Shrinking composed values and Schema objects preserves child candidates that were previously lost when exploring another branch.

Shrunk results and replay paths may change from earlier native releases. Re-run affected properties to obtain new replay tokens, and preserve important failing inputs as regression tests.
