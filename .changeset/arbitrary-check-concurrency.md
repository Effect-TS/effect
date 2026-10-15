---
"effect": patch
---

Add a `concurrency` option to `Arbitrary.checkEffect` that evaluates up to that many generated values at once. The result is the one a sequential check returns for the same seed: the first falsification in generation order is shrunk, and evaluations already started after it are interrupted.
