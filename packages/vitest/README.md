# Introduction

Welcome to your guide on testing Effect applications using `vitest` and the `@effect/vitest` package. This tutorial is crafted to assist beginners in setting up their testing environment and creating robust tests efficiently. The integration of `vitest` with the Effect library enhances your testing capabilities, allowing for more expressive and maintainable tests. Let’s get started with setting up your tools and then dive into writing some effective test cases.

# Requirements

First, install [`vitest`](https://vitest.dev/guide/) (version `1.6.0` or newer)

```sh
pnpm add -D vitest
```

Next, install the `@effect/vitest` package. This package integrates the Effect framework with Vitest for enhanced testing capabilities.

```sh
pnpm add -D @effect/vitest
```

# Writing tests

The `@effect/vitest` package extends the `it` function from Vitest with an `effect` property. This allows you to write concise and powerful tests. Here's the basic syntax:

```ts
import { it } from "@effect/vitest"

it(name, () => EffectContainingAssertions)
```

## Testing Successful Operations

Let's test a function that divides two numbers but can fail if the divisor is zero.

```ts
import { expect } from "vitest"
import { Effect } from "effect"
import { it } from "@effect/vitest"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

it.effect("test success", () =>
  Effect.gen(function* () {
    const result = yield* divide(4, 2)
    expect(result).toBe(2)
  })
)
```

## Testing successes and failures as `Exit`

To handle both successes and failures during testing, use `Effect.exit` to convert the result into an `Exit` object.

```ts
import { expect } from "vitest"
import { Effect, Exit } from "effect"
import { it } from "@effect/vitest"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

it.effect("test success as Exit", () =>
  Effect.gen(function* () {
    const result = yield* divide(4, 2).pipe(Effect.exit)
    expect(result).toStrictEqual(Exit.succeed(2))
  })
)

it.effect("test failure as Exit", () =>
  Effect.gen(function* () {
    const result = yield* divide(4, 0).pipe(Effect.exit)
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  })
)
```

## Skipping Tests

You can skip a test using `it.effect.skip`, which is useful when you want to temporarily disable a test without deleting any code.

```ts
it.effect.skip("test failure as Exit", () =>
  Effect.gen(function* () {
    const result = yield* divide(4, 0).pipe(Effect.exit)
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  })
)
```

## Running a Single Test

To run only a specific test and ignore all others, use `it.effect.only`. This is helpful during development to focus on a single test case.

```ts
it.effect.only("test failure as Exit", () =>
  Effect.gen(function* () {
    const result = yield* divide(4, 0).pipe(Effect.exit)
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  })
)
```
