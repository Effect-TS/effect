---
"effect": patch
---

Fix concurrent `Atom.fn` calls to return their own results, including synchronous successes and failures.
