---
title: Micro for Effect Users
excerpt: "Micro for Effect Users: Key Differences and Benefits"
bottomNavigation: pagination
---

<Info>
  The Micro module is currently in its experimental stages. We encourage your
  feedback to further improve its features.
</Info>

The `Micro` module in Effect is designed as a lighter alternative to the standard `Effect` module, tailored for situations where it is beneficial to reduce the bundle size.

This module is standalone and does not include more complex functionalities such as `Layer`, `Ref`, `Queue`, and `Deferred`. This feature set makes Micro especially suitable for libraries that wish to utilize Effect functionalities while keeping the bundle size to a minimum, particularly for those aiming to provide `Promise`-based APIs.

Micro also supports use cases where a client application uses Micro, and a server employs the full suite of Effect features, maintaining both compatibility and logical consistency across various application components.

Integrating Micro adds a minimal footprint to your bundle, starting at **5kb gzipped**, which may increase depending on the features you use.

<Warning>
  Utilizing major Effect modules beyond basic data modules like `Option`,
  `Either`, `Array`, will incorporate the Effect runtime into your bundle,
  negating the benefits of Micro.
</Warning>

## Importing Micro

Micro is a part of the Effect library and can be imported just like any other module:

```ts
import * as Micro from "effect/Micro"
```

## Main Types

### Micro

The `Micro` type uses three type parameters:

```ts
Micro<Success, Error, Requirements>
```

which mirror those of the `Effect` type.

### MicroExit

The `MicroExit` type is a streamlined version of the [Exit](../data-types/exit) type, designed to capture the outcome of a `Micro` computation. It uses the [Either](./data-types/either) data type to distinguish between successful outcomes and failures:

```ts
type MicroExit<A, E = never> = Either<A, MicroCause<E>>
```

### MicroCause

The `MicroCause` type is a streamlined version of the [Cause](../data-types/cause) type.

Similar to how `Cause` is a union of types, `MicroCause` consists of three specific types:

```ts
type MicroCause<E> = Die | Fail<E> | Interrupt
```

| **Failure Type** | **Description**                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `Die`            | Indicates an unforeseen defect that wasn't planned for in the system's logic.               |
| `Fail<E>`        | Covers anticipated errors that are recognized and typically handled within the application. |
| `Interrupt`      | Signifies an operation that has been purposefully stopped.                                  |

### MicroSchedule

The `MicroSchedule` type is a streamlined version of the [Schedule](../../guides/scheduling/introduction) type.

```ts
type MicroSchedule = (attempt: number, elapsed: number) => Option<number>
```

Represents a function that can be used to calculate the delay between
repeats.

The function takes the current attempt number and the elapsed time since
the first attempt, and returns the delay for the next attempt. If the
function returns `None`, the repetition will stop.

## How to Use This Guide

Below, you'll find a series of comparisons between the functionalities of `Effect` and `Micro`. Each table lists a functionality of `Effect` alongside its counterpart in `Micro`. The icons used have the following meanings:

- ⚠️: The feature is available in `Micro`, but with some differences from `Effect`.
- ❌: The feature is not available in `Effect`.

## Creating Effects

| Effect                 | Micro                   |                                      |
| ---------------------- | ----------------------- | ------------------------------------ |
| `Effect.try`           | ⚠️ `Micro.try`          | requires a `try` block               |
| `Effect.tryPromise`    | ⚠️ `Micro.tryPromise`   | requires a `try` block               |
| `Effect.sleep`         | ⚠️ `Micro.sleep`        | only handles milliseconds            |
| `Effect.failCause`     | ⚠️ `Micro.failWith`     | uses `MicroCause` instead of `Cause` |
| `Effect.failCauseSync` | ⚠️ `Micro.failWithSync` | uses `MicroCause` instead of `Cause` |
| ❌                     | `Micro.make`            |                                      |
| ❌                     | `Micro.fromOption`      |                                      |
| ❌                     | `Micro.fromEither`      |                                      |

## Running Effects

| Effect                  | Micro                     |                                                |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| `Effect.runSyncExit`    | ⚠️ `Micro.runSyncExit`    | returns a `MicroExit` instead of an `Exit`     |
| `Effect.runPromiseExit` | ⚠️ `Micro.runPromiseExit` | returns a `MicroExit` instead of an `Exit`     |
| `Effect.runFork`        | ⚠️ `Micro.runFork`        | returns a `Handle` instead of a `RuntimeFiber` |

### runSyncExit

The `Micro.runSyncExit` function is used to execute an Effect synchronously, which means it runs immediately and returns the result as a [MicroExit](#microexit).

```ts
import * as Micro from "effect/Micro"

const result1 = Micro.runSyncExit(Micro.succeed(1))
console.log(result1)
/*
Output:
{ _id: 'Either', _tag: 'Right', right: 1 }
*/

const result2 = Micro.runSyncExit(Micro.fail("my error"))
console.log(result2)
/*
Output:
{ _id: 'Either', _tag: 'Left', left: MicroCause.Fail: my error }
*/
```

### runPromiseExit

The `Micro.runPromiseExit` function is used to execute an Effect and obtain the result as a `Promise` that resolves to a [MicroExit](#microexit).

```ts
import * as Micro from "effect/Micro"

Micro.runPromiseExit(Micro.succeed(1)).then(console.log)
/*
Output:
{ _id: 'Either', _tag: 'Right', right: 1 }
*/

Micro.runPromiseExit(Micro.fail("my error")).then(console.log)
/*
Output:
{ _id: 'Either', _tag: 'Left', left: MicroCause.Fail: my error }
*/
```

### runFork

The `Micro.runFork` function executes the effect and return a `Handle` that can be awaited, joined, or aborted.

You can listen for the result by adding an observer using the handle's `addObserver` method.

```ts
import * as Micro from "effect/Micro"

const handle = Micro.succeed(42).pipe(Micro.delay(1000), Micro.runFork)

handle.addObserver((result) => {
  console.log(result)
})
console.log("observing...")
/*
Output:
observing...
{ _id: 'Either', _tag: 'Right', right: 42 }
*/
```

## Building Pipelines

| Effect             | Micro                |                                                         |
| ------------------ | -------------------- | ------------------------------------------------------- |
| `Effect.andThen`   | ⚠️ `Micro.andThen`   | doesn't handle `Promise` or `() => Promise` as argument |
| `Effect.tap`       | ⚠️ `Micro.tap`       | doesn't handle `() => Promise` as argument              |
| `Effect.all`       | ⚠️ `Micro.all`       | no `batching` and `mode` options                        |
| `Effect.forEach`   | ⚠️ `Micro.forEach`   | no `batching` option                                    |
| `Effect.filter`    | ⚠️ `Micro.filter`    | no `batching` option                                    |
| `Effect.filterMap` | ⚠️ `Micro.filterMap` | effectful                                               |

## Expected Errors

| Effect        | Micro           |                                            |
| ------------- | --------------- | ------------------------------------------ |
| `Effect.exit` | ⚠️ `Micro.exit` | returns a `MicroExit` instead of an `Exit` |

## Unexpected Errors

| Effect | Micro                |     |
| ------ | -------------------- | --- |
| ❌     | `Micro.catchCauseIf` |     |

## Timing Out

| Effect | Micro                 |     |
| ------ | --------------------- | --- |
| ❌     | `Micro.timeoutOrElse` |     |

## Requirements Management

To access a service while using `Micro.gen`, you need to wrap the service tag using the `Micro.service` function:

```ts
import * as Context from "effect/Context"
import * as Micro from "effect/Micro"

class Random extends Context.Tag("MyRandomService")<
  Random,
  { readonly next: Micro.Micro<number> }
>() {}

const program = Micro.gen(function* () {
  // const random = yield* Random // this doesn't work
  const random = yield* Micro.service(Random)
  const randomNumber = yield* random.next
  console.log(`random number: ${randomNumber}`)
})

const runnable = Micro.provideService(program, Random, {
  next: Micro.sync(() => Math.random())
})

Micro.runPromise(runnable)
/*
Example Output:
random number: 0.8241872233134417
*/
```

## Scope

| Effect       | Micro                |                                             |
| ------------ | -------------------- | ------------------------------------------- |
| `Scope`      | ⚠️ `MicroScope`      | returns a `MicroScope` instead of a `Scope` |
| `Scope.make` | ⚠️ `Micro.scopeMake` | returns a `MicroScope` instead of a `Scope` |

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const program =
  // create a new scope
  Micro.scopeMake.pipe(
    // add finalizer 1
    Micro.tap((scope) => scope.addFinalizer(() => consoleLog("finalizer 1"))),
    // add finalizer 2
    Micro.tap((scope) => scope.addFinalizer(() => consoleLog("finalizer 2"))),
    // close the scope
    Micro.andThen((scope) =>
      scope.close(Micro.ExitSucceed("scope closed successfully"))
    )
  )

Micro.runPromise(program)
/*
Output:
finalizer 2 <-- finalizers are closed in reverse order
finalizer 1
*/
```

## Retrying

| Effect         | Micro            |                     |
| -------------- | ---------------- | ------------------- |
| `Effect.retry` | ⚠️ `Micro.retry` | different `options` |

## Repetition

| Effect                               | Micro                 |                     |
| ------------------------------------ | --------------------- | ------------------- |
| `Effect.repeat`                      | ⚠️ `Micro.repeat`     | different `options` |
| ❌ (`Effect.exit` + `Effect.repeat`) | ⚠️ `Micro.repeatExit` |                     |

## Timing out

| Effect | Micro                 |     |
| ------ | --------------------- | --- |
| ❌     | `Micro.timeoutOrElse` |     |

## Sandboxing

| Effect           | Micro              |                                       |
| ---------------- | ------------------ | ------------------------------------- |
| `Effect.sandbox` | ⚠️ `Micro.sandbox` | `MicroCause<E>` instead of `Cause<E>` |

## Error Channel Operations

| Effect                 | Micro                    |                                       |
| ---------------------- | ------------------------ | ------------------------------------- |
| ❌                     | `Micro.filterOrFailWith` |                                       |
| `Effect.tapErrorCause` | ⚠️ `Micro.tapErrorCause` | `MicroCause<E>` instead of `Cause<E>` |
| ❌                     | `Micro.tapCauseIf`       |                                       |
| `Effect.tapDefect`     | ⚠️ `Micro.tapDefect`     | `unknown` instead of `Cause<never>`   |

## Requirements Management

| Effect           | Micro                     |                        |
| ---------------- | ------------------------- | ---------------------- |
| `Effect.provide` | ⚠️ `Micro.provideContext` | only handles `Context` |
| ❌               | `Micro.provideScope`      |                        |
| ❌               | `Micro.service`           |                        |

## Scoping, Resources and Finalization

| Effect                     | Micro                        |                                          |
| -------------------------- | ---------------------------- | ---------------------------------------- |
| `Effect.addFinalizer`      | ⚠️ `Micro.addFinalizer`      | `MicroExit` instead of `Exit` and no `R` |
| `Effect.acquireRelease`    | ⚠️ `Micro.acquireRelease`    | `MicroExit` instead of `Exit`            |
| `Effect.acquireUseRelease` | ⚠️ `Micro.acquireUseRelease` | `MicroExit` instead of `Exit`            |
| `Effect.onExit`            | ⚠️ `Micro.onExit`            | `MicroExit` instead of `Exit`            |
| `Effect.onError`           | ⚠️ `Micro.onError`           | uses `MicroCause` instead of `Cause`     |
| ❌                         | `Micro.onExitIf`             |                                          |

## Concurrency

| Effect              | Micro                 |                                    |
| ------------------- | --------------------- | ---------------------------------- |
| `Effect.fork`       | ⚠️ `Micro.fork`       | `Handle` instead of `RuntimeFiber` |
| `Effect.forkDaemon` | ⚠️ `Micro.forkDaemon` | `Handle` instead of `RuntimeFiber` |
| `Effect.forkIn`     | ⚠️ `Micro.forkIn`     | `Handle` instead of `RuntimeFiber` |
| `Effect.forkScoped` | ⚠️ `Micro.forkScoped` | `Handle` instead of `RuntimeFiber` |
