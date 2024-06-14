---
"effect": minor
---

Add `Tuple.at` api, to retrieve an element at a specified index from a tuple.

```ts
import { Tuple } from "effect"

assert.deepStrictEqual(Tuple.at([1, 'hello', true], 1), 'hello')
```
