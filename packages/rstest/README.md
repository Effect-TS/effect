# @effect/rstest

Helpers for testing Effect-based code with [Rstest](https://rstest.rs). Provides an enhanced `it` function with support for scoped tests, test services such as `TestClock`, shared layers, and property testing.

## Installation

Ensure a supported `@rstest/core` version is installed (`>=0.11.10 <1.0.0`), then add the package as a dev dependency:

```sh
npm install -D @rstest/core @effect/rstest@rc
```

Add a test script and an `rstest.config.ts`:

```json
{
  "scripts": {
    "test": "rstest"
  }
}
```

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core"

export default defineConfig({
  include: ["test/**/*.test.ts"]
})
```

`rstest` runs the suite once and exits; use `rstest --watch` for watch mode.

## Documentation

- [Effect website](https://effect.website)
- [`@effect/vitest`](https://effect.website/docs/v4/api/vitest), whose API this package mirrors
- [Rstest documentation](https://rstest.rs)

## Overview

The main entry point is the following import:

```ts
import { it } from "@effect/rstest"
```

This import enhances the standard `it` function from `@rstest/core` with several powerful features, including:

| Feature        | Description                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `it.effect`    | Runs a scoped test with test services such as `TestClock` and `TestConsole`.                        |
| `it.live`      | Runs a scoped test with the live Effect environment.                                                |
| `it.layer`     | Shares a `Layer` between multiple tests.                                                            |
| `it.prop`      | Runs property tests using Effect `Schema` and `Arbitrary` values.                                   |
| `it.flakyTest` | Retries an Effect that might occasionally fail until it succeeds or reaches the configured timeout. |

Property tests shrink callbacks that return `false`, throw, or complete with a non-interruption Effect failure. This
includes failed assertions, typed failures, and defects. Effect interruption still interrupts the test. Returning
normally with any value other than `false`, including `void`, passes for that generated input.

The Rstest `timeout` interrupts the Effect fiber running property generation, evaluation, and shrinking. Effect
finalizers run during the interruption, which is reported as a test timeout rather than a property falsification. As
with other Effect programs, a timeout cannot preempt a synchronous JavaScript callback that does not return.

## Writing Tests with `it.effect`

Here's how to use `it.effect` to write your tests:

**Syntax**

```ts
import { it } from "@effect/rstest"

it.effect("test name", () => EffectContainingAssertions, timeout: number | TestOptions = 5_000)
```

`it.effect` automatically provides the Effect test services, including [`TestClock`](#using-the-testclock), and a fresh `Scope` for each test. The scope is closed when the test finishes.

### Testing Successful Operations

To write a test, place your assertions directly within the main effect. This ensures that your assertions are evaluated as part of the test's execution.

**Example** (Testing a Successful Operation)

In the following example, we test a function that divides two numbers, but fails if the divisor is zero. The goal is to check that the function returns the correct result when given valid input.

```ts
import { expect, it } from "@effect/rstest"
import { Effect } from "effect"

// A simple divide function that returns an Effect, failing when dividing by zero
function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Testing a successful division
it.effect("test success", () =>
  Effect.gen(function*() {
    const result = yield* divide(4, 2) // Expect 4 divided by 2 to succeed
    expect(result).toBe(2) // Assert that the result is 2
  }))
```

### Testing Successes and Failures as `Exit`

When you need to handle both success and failure cases in a test, you can use `Effect.exit` to capture the outcome as an `Exit` object. This allows you to verify both successful and failed results within the same test structure.

**Example** (Testing Success and Failure with `Exit`)

```ts
import { expect, it } from "@effect/rstest"
import { Effect, Exit } from "effect"

// A function that divides two numbers and returns an Effect.
// It fails if the divisor is zero.
function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Test case for a successful division, using `Effect.exit` to capture the result
it.effect("test success as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 2)) // Capture the result as an Exit
    expect(result).toStrictEqual(Exit.succeed(2)) // Expect success with the value 2
  }))

// Test case for a failure (division by zero), using `Effect.exit`
it.effect("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0)) // Capture the result as an Exit
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero")) // Expect failure with the correct message
  }))
```

### Using the TestClock

When writing tests with `it.effect`, Effect test services are automatically provided. These include the [`TestClock`](https://effect.website/docs/guides/testing/testclock), which allows you to simulate the passage of time in your tests.

**Note**: If you want to use the real-time clock (instead of the simulated one), you can switch to `it.live`. Sleeping with `Effect.sleep` or `Schedule.spaced` under `it.effect` waits for virtual time: fork the sleeping fiber and advance `TestClock.adjust`, or use `it.live`. Otherwise the test reaches Rstest's real timeout without advancing the Effect clock.

**Example** (Using `TestClock` and `it.live`)

Here are examples that demonstrate how you can work with time in your tests using `it.effect` and `TestClock`:

1. **Using `it.live` to show the current time**: This will display the actual system time, since it runs in the live environment.

2. **Using `it.effect` without adjustments**: By default, the `TestClock` starts at `0`, simulating the beginning of time for your test without any time passing.

3. **Using `it.effect` and adjusting time**: In this test, we simulate the passage of time by advancing the clock by 1000 milliseconds (1 second).

```ts
import { it } from "@effect/rstest"
import { Clock, Effect } from "effect"
import { TestClock } from "effect/testing"

// Effect to log the current time
const logNow = Effect.gen(function*() {
  const now = yield* Clock.currentTimeMillis // Fetch the current time from the clock
  console.log(now) // Log the current time
})

// Example of using the real system clock with `it.live`
it.live("runs the test with the live Effect environment", () =>
  Effect.gen(function*() {
    yield* logNow // Prints the actual current time
  }))

// Example of using `it.effect` with the default test environment
it.effect("run the test with the test environment", () =>
  Effect.gen(function*() {
    yield* logNow // Prints 0, as the test clock starts at 0
  }))

// Example of advancing the test clock by 1000 milliseconds
it.effect("run the test with the test environment and the time adjusted", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust("1000 millis") // Move the clock forward by 1000 milliseconds
    yield* logNow // Prints 1000, reflecting the adjusted time
  }))
```

### Skipping Tests

If you need to temporarily disable a test but don't want to delete or comment out the code, you can use `it.effect.skip`. This is helpful when you're working on other parts of your test suite but want to keep the test for future execution.

**Example** (Skipping a Test)

```ts
import { it } from "@effect/rstest"
import { expect } from "@effect/rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Temporarily skip the test for dividing numbers
it.effect.skip("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  }))
```

### Running a Single Test

When you're developing or debugging, it's often useful to run a specific test without executing the entire test suite. You can achieve this by using `it.effect.only`, which will run just the selected test and ignore the others.

**Example** (Running a Single Test)

```ts
import { it } from "@effect/rstest"
import { expect } from "@effect/rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Run only this test, skipping all others
it.effect.only("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  }))
```

### Expecting Tests to Fail

When adding new failing tests, you might not be able to fix them right away. Instead of skipping them, you may want to assert it fails, so that when you fix them, you'll know and can re-enable them before it regresses.

**Example** (Asserting one test fails)

```ts
import { it } from "@effect/rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Temporarily assert that the test for dividing by zero fails.
it.effect.fails("dividing by zero special cases", ({ expect }) =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(0)
  }))
```

### Logging

By default, `it.effect` suppresses log output, which can be useful for keeping test results clean. However, if you want to enable logging during tests, you can use `it.live` or provide a custom logger to control the output.

**Example** (Controlling Logging in Tests)

```ts
import { it } from "@effect/rstest"
import { Effect, Logger } from "effect"

// This test won't display the log message, as logging is suppressed by default in `it.effect`
it.effect("does not display a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.effect") // Log won't be shown
  }))

// This test will display the log because a custom logger is provided
it.effect("providing a logger displays a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.effect with custom logger") // Log will be displayed
  }).pipe(
    Effect.provide(Logger.layer([Logger.consolePretty()])) // Providing a pretty logger for log output
  ))

// This test runs using `it.live`, which enables logging by default
it.live("it.live displays a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.live") // Log will be displayed
  }))
```

## Resource Safety and Scope

Both `it.effect` and `it.live` provide a fresh `Scope` and close it after each test. Test bodies can therefore use scoped resources directly. Do not wrap the test body in `Effect.scoped`, because the test runner already manages its scope.

The test fiber receives Rstest's abort signal. After a timeout, an `onTestFinished` barrier waits for the fiber and its finalizers before later sequential tests and suite teardown. The timeout remains a runner failure. The barrier has no second deadline: a finalizer that never completes can hold suite completion. It does not serialize explicitly concurrent tests. Native `afterEach` hooks run before this barrier and may observe unfinished cleanup after a timeout.

Successful Effect values are discarded before Promise resolution, including thenables. Failures and expected-failure modifiers retain their runner outcomes.

Shared-layer teardown interrupts and awaits unfinished setup before closing the layer scope. This covers named and unnamed layers, setup timeout, and early setup failure. Teardown retains the layer's hook timeout; cleanup exceeding that deadline can outlive the hook.

Named layers accept `{ concurrent: true }` or `{ concurrent: false }` to override inherited suite concurrency. Anonymous layers inherit the enclosing suite's concurrency. Nested named layers can override it again. Use the callback's `ctx.expect` for assertions in concurrent tests.

Call `addEqualityTesters()` in test setup to compare values implementing Effect's `Equal` protocol with `Equal.equals`. Ordinary values and asymmetric matchers retain Rstest's native behavior.

**Example** (Managing a Resource Lifecycle)

```ts
import { it } from "@effect/rstest"
import { Console, Effect } from "effect"

// Simulating the acquisition and release of a resource with console logging
const acquire = Console.log("acquire resource")
const release = Console.log("release resource")

// Defining a resource that requires proper management
const resource = Effect.acquireRelease(acquire, () => release)

it.effect("run with scope", () =>
  Effect.gen(function*() {
    yield* resource
  }))
```

## Writing Tests with `it.flakyTest`

`it.flakyTest` is a utility designed to manage tests that may not succeed consistently on the first attempt. These tests, often referred to as "flaky," can fail due to factors like timing issues, external dependencies, or randomness. `it.flakyTest` allows for retrying these tests until they pass or a specified timeout is reached.

**Example** (Handling Flaky Tests with Retries)

Let's start by setting up a basic test scenario that has the potential to fail randomly:

```ts
import { it } from "@effect/rstest"
import { Effect, Random } from "effect"

// Simulating a flaky effect
const flaky = Effect.gen(function*() {
  const random = yield* Random.nextBoolean
  if (random) {
    return yield* Effect.fail("Failed due to randomness")
  }
})

// Standard test that may fail intermittently
it.effect("possibly failing test", () => flaky)
```

In this test, the outcome is random, so the test might fail depending on the result of `Random.nextBoolean`.

To handle this flakiness, we use `it.flakyTest` to retry the test until it passes, or until a defined timeout expires:

```ts
// Retrying the flaky test with a 5-second timeout
it.effect("retrying until success or timeout", () => it.flakyTest(flaky, "5 seconds"))
```

## Differences from `@effect/vitest`

Rstest is intentionally Vitest-compatible, so `@effect/rstest` follows `@effect/vitest` closely. The differences forced by the runner are:

- **Runner re-exports**: the package re-exports `@rstest/core` instead of `vitest`, so `describe`, `expect`, `assert`, hooks and the `rs` utilities all come from Rstest.
- **Type namespaces**: use `Rstest.Methods`, `Rstest.Tester`, and the other Effect helper types. `EffectTest` remains an alias, and `Vitest` is a deprecated compatibility alias. The standalone `Rstest` type retains the runner utilities from `@rstest/core`.
- **`it.describe`**: Rstest's `it` does not expose `describe`, so the enhanced `it` attaches the runner's `describe` to keep `it.describe.each(...)` working.
- **`describeWrapped` returns `void`**: Rstest's `describe` does not return a `SuiteCollector`, and its suite callback receives no arguments, so `describeWrapped(name, f)` passes the enhanced global `it` to `f` and returns `void`.
- **Unnamed `layer(...)((it) => ...)` blocks**: Rstest has no `getCurrentSuite()` API, so the block's tests cannot be enumerated. An empty nested `describe` is used as the lifecycle boundary instead. Rstest omits the empty suite name from test paths, while its `beforeAll` / `afterAll` hooks build the layer before the block and release it before a later test in the enclosing suite runs.
- **Effect test options**: `it.effect`, `it.live`, and the property helpers accept `concurrent`, `skip`, `only`, `todo`, and `fails` in their options (`Rstest.TestOptions`). These map to Rstest's native modifiers. `{ concurrent: false }` overrides an enclosing concurrent suite; test selection uses `only`, then `skip`, then `todo` precedence. The raw runner exports such as `test` and `describe` retain Rstest's API: use their `.concurrent`, `.sequential`, `.skip`, `.only`, and `.todo` modifiers.
- **`skipIf` / `runIf` coercion**: Rstest types the condition as `boolean` (Vitest accepts `unknown`), so the condition uses JavaScript truthiness. The public signature still accepts `unknown`.

The package mirrors the Effect helpers, not every Vitest runner feature. Retry counts, repeats, timeouts, and JSON-serializable metadata pass through to Rstest. Vitest's retry objects (delay/condition), tags and tag filtering, annotations, benchmark contexts, `aroundEach`/`aroundAll`, and suite collectors do not have matching Rstest APIs. Mocking and fake timers use the re-exported `rs` utilities. Effect's `TestClock` remains separate from runner fake timers.
