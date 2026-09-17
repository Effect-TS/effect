---
"effect": patch
---

Generate unbounded and one-sided BigInt arbitraries from a mixture of small, ordinary and large magnitude ranges independently of collection size. Include values beyond JavaScript's safe integer and floating-point ranges, exercise explicit boundaries even outside the default ranges, and retain bounded generation. Try smaller-magnitude shrink candidates before halving huge roots so common counterexamples can be reduced within the default shrink budget.
