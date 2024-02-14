---
"@effect/platform-node-shared": minor
"@effect/typeclass": minor
"effect": minor
"@effect/schema": minor
"@effect/cli": minor
---

Swap type params of Either from `Either<E, A>` to `Either<R, L = never>`.

Along the same line of the other changes this allows to shorten the most common types such as:

```ts
import { Either } from "effect";

const right: Either.Either<string> = Either.right("ok");
```
