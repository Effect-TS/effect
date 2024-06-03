---
"effect": minor
---

add `ensure` util for Array, used to normalize `A | ReadonlyArray<A>`

```ts
import { ensure } from "effect/Array"

// lets say you are not 100% sure if it's a member or a collection
declare const someValue: {foo: string} | Array<{foo: string}>

// $ExpectType ({ foo: string })[]
const normalized = ensure(someValue)
```
