---
title: TestClock.ts
nav_order: 106
parent: Modules
---

## TestClock overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [TestClock](#testclock)
  - [TestClock (interface)](#testclock-interface)
  - [adjust](#adjust)
  - [adjustWith](#adjustwith)
  - [currentTimeMillis](#currenttimemillis)
  - [defaultTestClock](#defaulttestclock)
  - [live](#live)
  - [save](#save)
  - [setTime](#settime)
  - [sleep](#sleep)
  - [sleeps](#sleeps)
  - [testClock](#testclock-1)
  - [testClockWith](#testclockwith)

---

# utils

## TestClock

**Signature**

```ts
export declare const TestClock: Context.Tag<TestClock, TestClock>
```

Added in v1.0.0

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
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as TestClock from 'effect/TestClock'
import * as Option from 'effect/Option'

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
  adjust(duration: Duration.DurationInput): Effect.Effect<never, never, void>
  adjustWith(duration: Duration.DurationInput): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  save(): Effect.Effect<never, never, Effect.Effect<never, never, void>>
  setTime(time: number): Effect.Effect<never, never, void>
  sleeps(): Effect.Effect<never, never, Chunk.Chunk<number>>
}
```

Added in v1.0.0

## adjust

Accesses a `TestClock` instance in the context and increments the time
by the specified duration, running any actions scheduled for on or before
the new time in order.

**Signature**

```ts
export declare const adjust: (durationInput: Duration.DurationInput) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## adjustWith

**Signature**

```ts
export declare const adjustWith: ((
  duration: Duration.DurationInput
) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>) &
  (<R, E, A>(effect: Effect.Effect<R, E, A>, duration: Duration.DurationInput) => Effect.Effect<R, E, A>)
```

Added in v1.0.0

## currentTimeMillis

Accesses the current time of a `TestClock` instance in the context in
milliseconds.

**Signature**

```ts
export declare const currentTimeMillis: Effect.Effect<never, never, number>
```

Added in v1.0.0

## defaultTestClock

**Signature**

```ts
export declare const defaultTestClock: Layer.Layer<Live.TestLive | Annotations.TestAnnotations, never, TestClock>
```

Added in v1.0.0

## live

**Signature**

```ts
export declare const live: (
  data: Data.Data
) => Layer.Layer<Annotations.TestAnnotations | Live.TestLive, never, TestClock>
```

Added in v1.0.0

## save

Accesses a `TestClock` instance in the context and saves the clock
state in an effect which, when run, will restore the `TestClock` to the
saved state.

**Signature**

```ts
export declare const save: () => Effect.Effect<never, never, Effect.Effect<never, never, void>>
```

Added in v1.0.0

## setTime

Accesses a `TestClock` instance in the context and sets the clock time
to the specified `Instant`, running any actions scheduled for on or before
the new time in order.

**Signature**

```ts
export declare const setTime: (instant: number) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## sleep

Semantically blocks the current fiber until the clock time is equal to or
greater than the specified duration. Once the clock time is adjusted to
on or after the duration, the fiber will automatically be resumed.

**Signature**

```ts
export declare const sleep: (durationInput: Duration.DurationInput) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## sleeps

Accesses a `TestClock` instance in the context and returns a list of
times that effects are scheduled to run.

**Signature**

```ts
export declare const sleeps: () => Effect.Effect<never, never, Chunk.Chunk<number>>
```

Added in v1.0.0

## testClock

Retrieves the `TestClock` service for this test.

**Signature**

```ts
export declare const testClock: () => Effect.Effect<never, never, TestClock>
```

Added in v1.0.0

## testClockWith

Retrieves the `TestClock` service for this test and uses it to run the
specified workflow.

**Signature**

```ts
export declare const testClockWith: <R, E, A>(
  f: (testClock: TestClock) => Effect.Effect<R, E, A>
) => Effect.Effect<R, E, A>
```

Added in v1.0.0
