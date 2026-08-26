---
name: library-development
description: Effect implementation. Use for library Effect composition, failure handling, Context services, repository time APIs, or generated @barrel sections.
---

## Effect errors

Handle failures through the Effect type system. JavaScript `try` / `catch` does
not catch failures yielded inside `Effect.gen`.

```ts
Effect.gen(function*() {
  return yield* someEffect.pipe(
    Effect.catchAll(() => Effect.fail("Handled error"))
  )
})
```

Use `return yield*` for terminal effects so termination is explicit:

```ts
Effect.gen(function*() {
  if (invalidCondition) {
    return yield* Effect.fail("Validation failed")
  }

  if (shouldInterrupt) {
    return yield* Effect.interrupt
  }

  return yield* someOtherEffect
})
```

## Effect functions

Prefer `Effect.fnUntraced` over a function that only returns `Effect.gen`:

```ts
const fn = Effect.fnUntraced(function*(param: string) {
  // ...
})
```

Use `Effect.gen` for inline, one-off effect composition. Use
`Effect.fnUntraced` for reusable library implementations and hot paths where
tracing overhead is undesirable.

## Context services

Prefer class syntax for `Context.Service`:

```ts
import { Context } from "effect"

class MyService extends Context.Service<MyService, {
  readonly doSomething: (input: string) => number
}>()("MyService") {}
```

## Time

Use `Clock` rather than `Date.now` or `new Date`. Use `TestClock` in tests.

## Generated barrels

Only `index.ts` sections marked with `@barrel` are generated. Do not edit those
sections manually; update their source modules and run `pnpm codegen`.
Hand-maintained `index.ts` files and unmarked sections are not covered by this
rule.
