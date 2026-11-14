---
"effect": patch
---

Report unsupported regex patterns and their schema paths when Arbitrary sampling or property checking exhausts its discard budget.

When constructing `Arbitrary.SampleError` or `Arbitrary.Exhausted` values, include the required `diagnostics` array; use `[]` when there are no diagnostics.
