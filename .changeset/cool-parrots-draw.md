---
"effect": patch
---

Improve pattern handling by merging multiple patterns into a union, closes #4243.

Previously, the algorithm always prioritized the first pattern when multiple patterns were encountered.

This fix introduces a merging strategy that combines patterns into a union (e.g., `(?:${pattern1})|(?:${pattern2})`). By doing so, all patterns have an equal chance to generate values when using `FastCheck.stringMatching`.

**Example**

```ts
import { Arbitrary, FastCheck, Schema } from "effect"

// /^[^A-Z]*$/ (given by Lowercase) + /^0x[0-9a-f]{40}$/
const schema = Schema.Lowercase.pipe(Schema.pattern(/^0x[0-9a-f]{40}$/))

const arb = Arbitrary.make(schema)

// Before this fix, the first pattern would always dominate,
// making it impossible to generate values
const sample = FastCheck.sample(arb, { numRuns: 100 })

console.log(sample)
```
