---
"effect": patch
---

Fix `Number.remainder` to preserve a negative-zero dividend with ordinary finite, nonzero divisors, including when reusing the result of an integer remainder. For example, `Number.remainder(Number.remainder(-4, 2), 2)` now returns `-0` instead of `+0`, honoring the dividend's sign in both data-first and data-last calls. Callers distinguishing zero signs with `Object.is` or reciprocals will observe the correction. Positive-zero, zero-divisor, nonfinite-input, and scientific-notation behavior is unchanged.
