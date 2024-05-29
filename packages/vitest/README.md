# Introduction

Welcome to your guide on testing Effect applications using `vitest` and the `@effect/vitest` package! `@effect/vitest` is designed to help simplify running Effect-based tests through `vitest`.

In the guide below, we will first start by setting up the required dependencies. Then, we will dive into a few examples of how to use `@effect/vitest` to create some Effect-based test cases.

# Requirements

First, install [`vitest`](https://vitest.dev/guide/) (version `1.6.0` or newer)

```sh
pnpm add -D vitest
```

Next, install the `@effect/vitest` package which facilitates running Effect-based tests through `vitest`.

```sh
pnpm add -D @effect/vitest
```

# Overview

The main entry point is the following import:

```ts
import { it } from "@effect/vitest"
```

This import enhances the standard `it` function from `vitest` with several powerful features, including:

| Feature         | Description                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `it.effect`     | Automatically injects a `TestContext` (e.g., `TestClock`) when running a test.                         |
| `it.live`       | Runs the test with the live Effect environment.                                                        |
| `it.scoped`     | Allows running an Effect program that requires a `Scope`.                                              |
| `it.scopedLive` | Combines the features of `scoped` and `live`, using a live Effect environment that requires a `Scope`. |
| `it.flakyTest`  | Facilitates the execution of tests that might occasionally fail.                                       |

# Writing Tests with `it.effect`

Here's how to use `it.effect` to write your tests:

```ts
import { it } from "@effect/vitest"

it.effect("test name", () => EffectContainingAssertions, timeout: number | TestOptions = 5_000)
```

When using `it.effect`, the `TestContext` is automatically injected, which allows tests to have access to services designed to facilitate testing (such as the [`TestClock`](#using-the-testclock)).

## Testing Successful Operations

Let's create a test for a function that divides two numbers but fails if the divisor is zero:

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

## Testing Successes and Failures as `Exit`

To test both success and failure scenarios, convert the outcomes into an `Exit` object using `Effect.exit`:

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

## Using the TestClock

When using `it.effect`, a `TestContext` is provided to your program which provides access to several services designed to facilitate testing. One such service is the `[TestClock`](https://effect.website/docs/guides/testing/testclock) which is designed to simulate the passage of time.

**Note**: To utilize the default, non-testing services in your tests you can use `it.live`.

Below, you'll find examples illustrating different ways to use time in your tests:

1. **Using `it.live` to show the current time:** This mode uses the real-time clock of your system, reflecting the actual current time.

2. **Using `it.effect` with no adjustments:** By default, this test starts the clock at a time of `0`, effectively simulating a starting point without any elapsed time.

3. **Using `it.effect` and adjusting time forward:** Here, we advance the clock by 1000 milliseconds to test scenarios that depend on the passing of time.

```ts
import { Effect, Clock, TestClock } from "effect"
import { it } from "@effect/vitest"

const logNow = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis
  console.log(now)
})

it.live("runs the test with the live Effect environment", () =>
  Effect.gen(function* () {
    yield* logNow // prints the actual time
  })
)

it.effect("run the test with the test environment", () =>
  Effect.gen(function* () {
    yield* logNow // prints 0
  })
)

it.effect("run the test with the test environment and the time adjusted", () =>
  Effect.gen(function* () {
    yield* TestQlock.adjust("1000 millis")
    yield* logNow // prints 1000
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

# Writing Tests with `it.scoped`

The `it.scoped` method allows you to run tests that involve Effect programs requiring a `Scope`. A `Scope` is essential when your Effect needs to manage resources that must be acquired before the test and released after it completes. This ensures that all resources are properly cleaned up, preventing leaks and ensuring test isolation.

Here’s a simple example to demonstrate how `it.scoped` can be used in your tests:

```ts
import { Effect, Console } from "effect"
import { it } from "@effect/vitest"

// Simulate acquiring and releasing a resource with console logging
const acquire = Console.log("acquire resource")
const release = Console.log("release resource")

// Define a resource that needs to be managed
const resource = Effect.acquireRelease(acquire, () => release)

// Incorrect usage: This will result in a type error because it lacks a scope
it.effect("run with scope", () =>
  Effect.gen(function* () {
    yield* resource
  })
)

// Correct usage: Using 'it.scoped' to properly manage the scope
it.scoped("run with scope", () =>
  Effect.gen(function* () {
    yield* resource
  })
)
```

# Writing Tests with `it.flakyTest`

`it.flakyTest` is a function from the `@effect/vitest` package designed to handle tests that might not succeed on the first try. These tests are often called "flaky" tests because their outcome can vary (e.g., due to timing issues, external dependencies, or randomness). `it.flakyTest` allows these tests to be retried until they succeed or until a specified timeout period expires.

Here's how you can use `it.flakyTest` in your test suite:

First, let’s set up a basic test scenario that could potentially fail randomly:

```ts
import { it } from "@effect/vitest"
import { Effect, Random } from "effect"

// Define a flaky test effect
const flaky = Effect.gen(function* () {
  const random = yield* Random.nextBoolean
  if (random) {
    return yield* Effect.fail("Failed due to randomness")
  }
})

// Standard test, which may fail intermittently
it.effect("possibly failing test", () => flaky)
```

To address the flakiness, we apply `it.flakyTest` which will retry the test until it succeeds or the specified timeout is reached:

```ts
// Retrying the flaky test with a timeout
it.effect("retrying until success or timeout", () =>
  it.flakyTest(flaky, "5 seconds")
)
```
