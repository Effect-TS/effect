---
"effect": minor
---

add `cast` util for Array, used to normalize `A | Array<A>`

```ts
import { cast } from "effect/Array"

declare const someValue: {foo: string} | Array<{foo: string}>

// $ExpectType ({ foo: string })[]
const normalized = cast(someValue)
```
