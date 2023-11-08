---
title: TestClock.ts
nav_order: 123
parent: Modules
---

## TestClock overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Data (interface)](#data-interface)
  - [TestClock](#testclock)
  - [TestClock (interface)](#testclock-interface)
  - [adjust](#adjust)
  - [adjustWith](#adjustwith)
  - [currentTimeMillis](#currenttimemillis)
  - [defaultTestClock](#defaulttestclock)
  - [live](#live)
  - [makeData](#makedata)
  - [save](#save)
  - [setTime](#settime)
  - [sleep](#sleep)
  - [sleeps](#sleeps)
  - [testClock](#testclock-1)
  - [testClockWith](#testclockwith)

---

# utils

## Data (interface)

`Data` represents the state of the `TestClock`, including the clock time.

**Signature**

```ts
export interface Data {
  readonly instant: number
  readonly sleeps: Chunk.Chunk<readonly [number, Deferred.Deferred<never, void>]>
}
```

Added in v2.0.1

## TestClock

**Signature**

```ts
export declare const TestClock: Context.Tag<TestClock, TestClock>
```

Added in v2.0.0

## TestClock (interface)

A `TestClock` makes it easy to deterministically and efficiently test effects
involving the passage of time.

Instead of waiting for actual time to pass, `sleep` and methods implemented
in terms of it schedule effects to take place at a given clock time. Users
can adjust the clock time using the `adjust` and `setTime` methods, and all
effects scheduled to take place on or before that time will automatically be
run in order.

For example, here is how we can test `Effect.timeout` using `TestClock`:

```ts
import * as Duration from "effect/Duration"
import { Effect } from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as TestClock from "effect/TestClock"
import { Option } from "effect/Option"

Effect.gen(function* () {
  const fiber = yield* pipe(Effect.sleep(Duration.minutes(5)), Effect.timeout(Duration.minutes(1)), Effect.fork)
  yield* TestClock.adjust(Duration.minutes(1))
  const result = yield* Fiber.join(fiber)
  assert.deepStrictEqual(result, Option.none())
})
```

Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
and methods derived from it will semantically block until the time is set to
on or after the time they are scheduled to run. If we didn't fork the fiber
on which we called sleep we would never get to set the time on the line
below. Thus, a useful pattern when using `TestClock` is to fork the effect
being tested, then adjust the clock time, and finally verify that the
expected effects have been performed.

**Signature**

```ts
export interface TestClock extends Clock.Clock {
  adjust(duration: Duration.DurationInput): Effect<never, never, void>
  adjustWith(duration: Duration.DurationInput): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  save(): Effect<never, never, Effect<never, never, void>>
  setTime(time: number): Effect<never, never, void>
  sleeps(): Effect<never, never, Chunk.Chunk<number>>
}
```

Added in v2.0.0

## adjust

Accesses a `TestClock` instance in the context and increments the time
by the specified duration, running any actions scheduled for on or before
the new time in order.

**Signature**

```ts
export declare const adjust: (durationInput: Duration.DurationInput) => Effect<never, never, void>
```

Added in v2.0.0

## adjustWith

**Signature**

```ts
export declare const adjustWith: ((
  duration: Duration.DurationInput
) => <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>) &
  (<R, E, A>(effect: Effect<R, E, A>, duration: Duration.DurationInput) => Effect<R, E, A>)
```

Added in v2.0.0

## currentTimeMillis

Accesses the current time of a `TestClock` instance in the context in
milliseconds.

**Signature**

```ts
export declare const currentTimeMillis: Effect<never, never, number>
```

Added in v2.0.0

## defaultTestClock

**Signature**

```ts
export declare const defaultTestClock: Layer.Layer<Annotations.TestAnnotations | Live.TestLive, never, TestClock>
```

Added in v2.0.0

## live

**Signature**

```ts
export declare const live: (data: Data) => Layer.Layer<Annotations.TestAnnotations | Live.TestLive, never, TestClock>
```

Added in v2.0.0

## makeData

**Signature**

```ts
export declare const makeData: (
  instant: number,
  sleeps: Chunk.Chunk<readonly [number, Deferred.Deferred<never, void>]>
) => Data
```

Added in v2.0.0

## save

Accesses a `TestClock` instance in the context and saves the clock
state in an effect which, when run, will restore the `TestClock` to the
saved state.

**Signature**

```ts
export declare const save: () => Effect<never, never, Effect<never, never, void>>
```

Added in v2.0.0

## setTime

Accesses a `TestClock` instance in the context and sets the clock time
to the specified `Instant`, running any actions scheduled for on or before
the new time in order.

**Signature**

```ts
export declare const setTime: (instant: number) => Effect<never, never, void>
```

Added in v2.0.0

## sleep

Semantically blocks the current fiber until the clock time is equal to or
greater than the specified duration. Once the clock time is adjusted to
on or after the duration, the fiber will automatically be resumed.

**Signature**

```ts
export declare const sleep: (durationInput: Duration.DurationInput) => Effect<never, never, void>
```

Added in v2.0.0

## sleeps

Accesses a `TestClock` instance in the context and returns a list of
times that effects are scheduled to run.

**Signature**

```ts
export declare const sleeps: () => Effect<never, never, Chunk.Chunk<number>>
```

Added in v2.0.0

## testClock

Retrieves the `TestClock` service for this test.

**Signature**

```ts
export declare const testClock: () => Effect<never, never, TestClock>
```

Added in v2.0.0

## testClockWith

Retrieves the `TestClock` service for this test and uses it to run the
specified workflow.

**Signature**

```ts
export declare const testClockWith: <R, E, A>(
  f: (testClock: TestClock) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0
