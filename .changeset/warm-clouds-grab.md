---
"effect": minor
---

add Effect.filterEffect\* apis

#### Effect.filterEffectOrElse

Filters an effect with an effectful predicate, falling back to an alternative
effect if the predicate fails.

```ts
import { Effect, pipe } from "effect"

// Define a user interface
interface User {
  readonly name: string
}

// Simulate an asynchronous authentication function
declare const auth: () => Promise<User | null>

const program = pipe(
  Effect.promise(() => auth()),
  // Use filterEffectOrElse with an effectful predicate
  Effect.filterEffectOrElse({
    predicate: (user) => Effect.succeed(user !== null),
    orElse: (user) => Effect.fail(new Error(`Unauthorized user: ${user}`))
  })
)
```

#### Effect.filterEffectOrFail

Filters an effect with an effectful predicate, failing with a custom error if the predicate fails.

```ts
import { Effect, pipe } from "effect"

// Define a user interface
interface User {
  readonly name: string
}

// Simulate an asynchronous authentication function
declare const auth: () => Promise<User | null>

const program = pipe(
  Effect.promise(() => auth()),
  // Use filterEffectOrFail with an effectful predicate
  Effect.filterEffectOrFail({
    predicate: (user) => Effect.succeed(user !== null),
    orFailWith: (user) => Effect.fail(new Error(`Unauthorized user: ${user}`))
  })
)
```
