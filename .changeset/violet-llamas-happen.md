---
"effect": patch
---

add Number.nextPow2

This function returns the next power of 2 from the given number.

```ts
import { nextPow2 } from "effect/Number";

assert.deepStrictEqual(nextPow2(5), 8);
assert.deepStrictEqual(nextPow2(17), 32);
```
