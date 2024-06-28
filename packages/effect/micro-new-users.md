---
title: Getting Started with Micro
excerpt: "Getting Started with Micro: A Primer for New Users"
bottomNavigation: pagination
---

## Importing Micro

Before you start, make sure you have completed the following setup:

- Install the `effect` library in your project. If it is not already installed, you can add it using npm with the following command:
  ```bash
  npm install effect
  ```

Micro is a component of the Effect library and can be imported similarly to any other module in your TypeScript project:

```ts
import * as Micro from "effect/Micro"
```

This import statement allows you to access all functionalities of Micro, enabling you to use its features in your application.

## The Micro Type

The `Micro` type uses three type parameters:

```ts
Micro<Success, Error, Requirements>
```

which mirror those of the `Effect` type:

- **Success**. Represents the type of value that an effect can succeed with when executed.
  If this type parameter is `void`, it means the effect produces no useful information, while if it is `never`, it means the effect runs forever (or until failure).
- **Error**. Represents the expected errors that can occur when executing an effect.
  If this type parameter is `never`, it means the effect cannot fail, because there are no values of type `never`.
- **Requirements**. Represents the contextual data required by the effect to be executed.
  This data is stored in a collection named `Context`.
  If this type parameter is `never`, it means the effect has no requirements and the `Context` collection is empty.

## Tutorial: Wrapping a Promise-based API with Micro

In this tutorial, we'll demonstrate how to wrap a Promise-based API using the `Micro` library from Effect. We'll use a simple example where we interact with a hypothetical weather forecasting API. The goal is to encapsulate the asynchronous API call within Micro's structured error handling and execution flow.

### Step 1: Create a Promise-based API Function

First, let's define a simple Promise-based function that simulates fetching weather data from an external service.

```ts
function fetchWeather(city: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (city === "London") {
        resolve("Sunny")
      } else {
        reject(new Error("Weather data not found for this location"))
      }
    }, 1_000)
  })
}
```

### Step 2: Wrap the Promise with Micro

Next, we'll wrap our `fetchWeather` function using Micro to handle both successful and failed Promise outcomes.

```ts
import * as Micro from "effect/Micro"

function fetchWeather(city: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (city === "London") {
        resolve("Sunny")
      } else {
        reject(new Error("Weather data not found for this location"))
      }
    }, 1_000)
  })
}

function getWeather(city: string) {
  return Micro.promise(() => fetchWeather(city))
}
```

Here, `Micro.promise` is used to convert the Promise returned by `fetchWeather` into a Micro effect.

### Step 3: Running the Micro Effect

After wrapping our function, we need to execute the Micro effect and handle the results.

```ts
import * as Micro from "effect/Micro"

function fetchWeather(city: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (city === "London") {
        resolve("Sunny")
      } else {
        reject(new Error("Weather data not found for this location"))
      }
    }, 1_000)
  })
}

function getWeather(city: string) {
  return Micro.promise(() => fetchWeather(city))
}

const weatherEffect = getWeather("London")

Micro.runPromise(weatherEffect)
  .then((result) => console.log(`The weather in London is: ${result}`))
  .catch((error) =>
    console.error(`Failed to fetch weather data: ${error.message}`)
  )
/*
Output:
The weather in London is: Sunny
*/
```

In this snippet, `Micro.runPromise` is used to execute the `weatherEffect`.
It converts the Micro effect back into a Promise, making it easier to integrate with other Promise-based code or simply to manage asynchronous operations in a familiar way.

### Step 4: Adding Error Handling

To further enhance the function, you might want to handle specific errors differently.
Micro provides methods like `Micro.tryPromise` to handle anticipated errors gracefully.

```ts
import * as Micro from "effect/Micro"

function fetchWeather(city: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (city === "London") {
        resolve("Sunny")
      } else {
        reject(new Error("Weather data not found for this location"))
      }
    }, 1_000)
  })
}

class WeatherError {
  readonly _tag = "WeatherError"
  constructor(readonly message: string) {}
}

function getWeather(city: string) {
  return Micro.tryPromise({
    try: () => fetchWeather(city),
    // remap the error
    catch: (error) => new WeatherError(String(error))
  })
}

const weatherEffect = getWeather("Paris")

Micro.runPromise(weatherEffect)
  .then((result) => console.log(`The weather in London is: ${result}`))
  .catch((error) => console.error(`Failed to fetch weather data: ${error}`))
/*
Output:
Failed to fetch weather data: MicroCause.Fail: {"_tag":"WeatherError","message":"Error: Weather data not found for this location"}
*/
```

## Error Management

### Catching all Errors

#### either

```ts
import * as Either from "effect/Either"
import * as Micro from "effect/Micro"

class NetworkError {
  readonly _tag = "NetworkError"
}
class ValidationError {
  readonly _tag = "ValidationError"
}

const program = Micro.gen(function* () {
  // Simulate network and validation errors
  if (Math.random() > 0.5) yield* Micro.fail(new NetworkError())
  if (Math.random() > 0.5) yield* Micro.fail(new ValidationError())
})

const recovered = Micro.gen(function* () {
  const failureOrSuccess = yield* Micro.either(program)
  if (Either.isLeft(failureOrSuccess)) {
    // failure case: you can extract the error from the `left` property
    const error = failureOrSuccess.left
    return `Recovering from ${error._tag}`
  } else {
    // success case: you can extract the value from the `right` property
    return failureOrSuccess.right
  }
})

Micro.runPromiseExit(recovered).then(console.log)
/*
Example Output:
{
  _id: 'Either',
  _tag: 'Right',
  right: 'Recovering from ValidationError'
}
*/
```

With `Either.match`:

```ts
import * as Either from "effect/Either"
import * as Micro from "effect/Micro"

class NetworkError {
  readonly _tag = "NetworkError"
}
class ValidationError {
  readonly _tag = "ValidationError"
}

const program = Micro.gen(function* () {
  // Simulate network and validation errors
  if (Math.random() > 0.5) yield* Micro.fail(new NetworkError())
  if (Math.random() > 0.5) yield* Micro.fail(new ValidationError())
})

const recovered = Micro.gen(function* () {
  const failureOrSuccess = yield* Micro.either(program)
  return Either.match(failureOrSuccess, {
    onLeft: (error) => `Recovering from ${error._tag}`,
    onRight: (value) => value // do nothing in case of success
  })
})

Micro.runPromiseExit(recovered).then(console.log)
/*
Example Output:
{
  _id: 'Either',
  _tag: 'Right',
  right: 'Recovering from ValidationError'
}
*/
```

#### catchAll

```ts
import * as Micro from "effect/Micro"

class NetworkError {
  readonly _tag = "NetworkError"
}
class ValidationError {
  readonly _tag = "ValidationError"
}

const program = Micro.gen(function* () {
  // Simulate network and validation errors
  if (Math.random() > 0.5) yield* Micro.fail(new NetworkError())
  if (Math.random() > 0.5) yield* Micro.fail(new ValidationError())
})

const recovered = program.pipe(
  Micro.catchAll((error) => Micro.succeed(`Recovering from ${error._tag}`))
)

Micro.runPromiseExit(recovered).then(console.log)
/*
Example Output:
{ _id: 'Either', _tag: 'Right', right: 'Recovering from NetworkError' }
*/
```

### Catching Some Errors

#### catchTag

```ts
import * as Micro from "effect/Micro"

class NetworkError {
  readonly _tag = "NetworkError"
}
class ValidationError {
  readonly _tag = "ValidationError"
}

const program = Micro.gen(function* () {
  // Simulate network and validation errors
  if (Math.random() > 0.5) yield* Micro.fail(new NetworkError())
  if (Math.random() > 0.5) yield* Micro.fail(new ValidationError())
})

const recovered = program.pipe(
  Micro.catchTag("ValidationError", (_fooError) =>
    Micro.succeed("Recovering from ValidationError")
  )
)

Micro.runPromiseExit(recovered).then(console.log)
/*
Example Output:
{
  _id: 'Either',
  _tag: 'Right',
  right: 'Recovering from ValidationError'
}
*/
```

## Unexpected Errors

### Creating Unrecoverable Errors

#### die

```ts
import * as Micro from "effect/Micro"

const divide = (a: number, b: number): Micro.Micro<number> =>
  b === 0 ? Micro.die(new Error("Cannot divide by zero")) : Micro.succeed(a / b)

Micro.runSync(divide(1, 0)) // throws Error: Cannot divide by zero
```

#### orDie

```ts
import * as Micro from "effect/Micro"

const divide = (a: number, b: number): Micro.Micro<number, Error> =>
  b === 0
    ? Micro.fail(new Error("Cannot divide by zero"))
    : Micro.succeed(a / b)

const program = Micro.orDie(divide(1, 0))

Micro.runSync(program) // throws Error: Cannot divide by zero
```

#### catchAllDefect

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const program = Micro.catchAllDefect(
  Micro.die("Boom!"), // Simulating a runtime error
  (defect) => consoleLog(`Unknown defect caught: ${defect}`)
)

// We get an Either.Right because we caught all defects
Micro.runPromiseExit(program).then(console.log)
/*
Output:
Unknown defect caught: Boom!
{ _id: 'Either', _tag: 'Right', right: undefined }
*/
```

## Fallback

### orElseSucceed

The `Micro.orElseSucceed` function will always replace the original failure with a success value, so the resulting effect cannot fail:

```ts
import * as Micro from "effect/Micro"

class NegativeAgeError {
  readonly _tag = "NegativeAgeError"
  constructor(readonly age: number) {}
}

class IllegalAgeError {
  readonly _tag = "IllegalAgeError"
  constructor(readonly age: number) {}
}

const validate = (
  age: number
): Micro.Micro<number, NegativeAgeError | IllegalAgeError> => {
  if (age < 0) {
    return Micro.fail(new NegativeAgeError(age))
  } else if (age < 18) {
    return Micro.fail(new IllegalAgeError(age))
  } else {
    return Micro.succeed(age)
  }
}

const program = Micro.orElseSucceed(validate(3), () => 0)
```

## Matching

### match

```ts
import * as Micro from "effect/Micro"

const success: Micro.Micro<number, Error> = Micro.succeed(42)
const failure: Micro.Micro<number, Error> = Micro.fail(new Error("Uh oh!"))

const program1 = Micro.match(success, {
  onFailure: (error) => `failure: ${error.message}`,
  onSuccess: (value) => `success: ${value}`
})

Micro.runPromise(program1).then(console.log) // Output: "success: 42"

const program2 = Micro.match(failure, {
  onFailure: (error) => `failure: ${error.message}`,
  onSuccess: (value) => `success: ${value}`
})

Micro.runPromise(program2).then(console.log) // Output: "failure: Uh oh!"
```

### matchEffect

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const success: Micro.Micro<number, Error> = Micro.succeed(42)
const failure: Micro.Micro<number, Error> = Micro.fail(new Error("Uh oh!"))

const program1 = Micro.matchEffect(success, {
  onFailure: (error) =>
    Micro.succeed(`failure: ${error.message}`).pipe(Micro.tap(consoleLog)),
  onSuccess: (value) =>
    Micro.succeed(`success: ${value}`).pipe(Micro.tap(consoleLog))
})

Micro.runSync(program1)
/*
Output:
success: 42
*/

const program2 = Micro.matchEffect(failure, {
  onFailure: (error) =>
    Micro.succeed(`failure: ${error.message}`).pipe(Micro.tap(consoleLog)),
  onSuccess: (value) =>
    Micro.succeed(`success: ${value}`).pipe(Micro.tap(consoleLog))
})

Micro.runSync(program2)
/*
Output:
failure: Uh oh!
*/
```

### matchCause / matchCauseEffect

```ts
import * as Micro from "effect/Micro"

declare const exceptionalEffect: Micro.Micro<void, Error>

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const program = Micro.matchCauseEffect(exceptionalEffect, {
  onFailure: (cause) => {
    switch (cause._tag) {
      case "Fail":
        return consoleLog(`Fail: ${cause.error.message}`)
      case "Die":
        return consoleLog(`Die: ${cause.defect}`)
      case "Interrupt":
        return consoleLog("interrupted!")
    }
  },
  onSuccess: (value) => consoleLog(`succeeded with ${value} value`)
})
```

## Retrying

To demonstrate the functionality of different retry functions, we will be working with the following helper that simulates an effect with possible failures:

```ts
import * as Micro from "effect/Micro"

let count = 0

// Simulates an effect with possible failures
export const effect = Micro.async<string, Error>((resume) => {
  if (count <= 2) {
    count++
    console.log("failure")
    resume(Micro.fail(new Error()))
  } else {
    console.log("success")
    resume(Micro.succeed("yay!"))
  }
})
```

### retry

```ts
import * as Micro from "effect/Micro"
import { effect } from "./fake.js"

// Define a repetition policy using a spaced delay between retries
const policy = Micro.scheduleSpaced(100)

const repeated = Micro.retry(effect, { schedule: policy })

Micro.runPromise(repeated).then(console.log)
/*
Output:
failure
failure
failure
success
yay!
*/
```

## Sandboxing

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const effect = Micro.fail("Oh uh!").pipe(Micro.as("primary result"))

const sandboxed = Micro.sandbox(effect)

const program = sandboxed.pipe(
  Micro.catchTag("Fail", (cause) =>
    consoleLog(`Caught a defect: ${cause.error}`).pipe(
      Micro.as("fallback result on expected error")
    )
  ),
  Micro.catchTag("Interrupt", () =>
    consoleLog(`Caught a defect`).pipe(
      Micro.as("fallback result on fiber interruption")
    )
  ),
  Micro.catchTag("Die", (cause) =>
    consoleLog(`Caught a defect: ${cause.defect}`).pipe(
      Micro.as("fallback result on unexpected error")
    )
  )
)

Micro.runPromise(program).then(console.log)
/*
Output:
Caught a defect: Oh uh!
fallback result on expected error
*/
```

## Inspecting Errors

### tapError

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

// Create an effect that is designed to fail, simulating an occurrence of a network error
const task: Micro.Micro<number, string> = Micro.fail("NetworkError")

// Log the error message if the task fails. This function only executes if there is an error,
// providing a method to handle or inspect errors without altering the outcome of the original effect.
const tapping = Micro.tapError(task, (error) =>
  consoleLog(`expected error: ${error}`)
)

Micro.runFork(tapping)
/*
Output:
expected error: NetworkError
*/
```

### tapErrorCause

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

// Create an effect that is designed to fail, simulating an occurrence of a network error
const task1: Micro.Micro<number, string> = Micro.fail("NetworkError")
// This will log the cause of any expected error or defect
const tapping1 = Micro.tapErrorCause(task1, (cause) =>
  consoleLog(`error cause: ${cause}`)
)

Micro.runFork(tapping1)
/*
Output:
error cause: MicroCause.Fail: NetworkError
*/

// Simulate a severe failure in the system by causing a defect with a specific message.
const task2: Micro.Micro<number, string> = Micro.die("Something went wrong")

// This will log the cause of any expected error or defect
const tapping2 = Micro.tapErrorCause(task2, (cause) =>
  consoleLog(`error cause: ${cause}`)
)

Micro.runFork(tapping2)
/*
Output:
error cause: MicroCause.Die: Something went wrong
*/
```

### tapDefect

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

// Create an effect that is designed to fail, simulating an occurrence of a network error
const task1: Micro.Micro<number, string> = Micro.fail("NetworkError")

// this won't log anything because is not a defect
const tapping1 = Micro.tapDefect(task1, (cause) =>
  consoleLog(`defect: ${cause}`)
)

Micro.runFork(tapping1)
/*
No Output
*/

// Simulate a severe failure in the system by causing a defect with a specific message.
const task2: Micro.Micro<number, string> = Micro.die("Something went wrong")

// This will only log defects, not errors
const tapping2 = Micro.tapDefect(task2, (cause) =>
  consoleLog(`defect: ${cause}`)
)

Micro.runFork(tapping2)
/*
Output:
defect: Something went wrong
*/
```

## Yieldable Errors

### Error

```ts
import * as Micro from "effect/Micro"

class MyError extends Micro.Error<{ message: string }> {}

export const program = Micro.gen(function* () {
  yield* new MyError({ message: "Oh no!" }) // same as yield* Effect.fail(new MyError({ message: "Oh no!" })
})

Micro.runPromiseExit(program).then(console.log)
/*
Output:
{
  _id: 'Either',
  _tag: 'Left',
  left: (MicroCause.Fail) Error: Oh no!
      ...stack trace...
}
*/
```

### TaggedError

```ts
import * as Micro from "effect/Micro"

// An error with _tag: "Foo"
class FooError extends Micro.TaggedError("Foo")<{
  message: string
}> {}

// An error with _tag: "Bar"
class BarError extends Micro.TaggedError("Bar")<{
  randomNumber: number
}> {}

export const program = Micro.gen(function* () {
  const n = Math.random()
  return n > 0.5
    ? "yay!"
    : n < 0.2
      ? yield* new FooError({ message: "Oh no!" })
      : yield* new BarError({ randomNumber: n })
}).pipe(
  Micro.catchTag("Foo", (error) =>
    Micro.succeed(`Foo error: ${error.message}`)
  ),
  Micro.catchTag("Bar", (error) =>
    Micro.succeed(`Bar error: ${error.randomNumber}`)
  )
)

Micro.runPromise(program).then(console.log, console.error)
/*
Example Output (n < 0.2):
Foo error: Oh no!
*/
```

## Requirements Management

```ts
import * as Context from "effect/Context"
import * as Micro from "effect/Micro"

// Define a service using a unique context tag
class Random extends Context.Tag("MyRandomService")<
  Random,
  { readonly next: Micro.Micro<number> }
>() {}

const program = Micro.gen(function* () {
  // Access the Random service
  const random = yield* Micro.service(Random)
  // Retrieve a random number from the service
  const randomNumber = yield* random.next
  console.log(`random number: ${randomNumber}`)
})

// Provide the Random service implementation
const runnable = Micro.provideService(program, Random, {
  next: Micro.sync(() => Math.random())
})

// Execute the program and print the random number
Micro.runPromise(runnable)
/*
Example Output:
random number: 0.8241872233134417
*/
```

## Resource Management

### Scope

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
      scope.close(Micro.exitSucceed("scope closed successfully"))
    )
  )

Micro.runPromise(program)
/*
Output:
finalizer 2 <-- finalizers are closed in reverse order
finalizer 1
*/
```

### addFinalizer

Let's observe how things behave in the event of success:

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message: string) => Micro.sync(() => console.log(message))

const program = Micro.gen(function* () {
  yield* Micro.addFinalizer((exit) =>
    consoleLog(`finalizer after ${exit._tag}`)
  )
  return 1
})

const runnable = Micro.scoped(program)

Micro.runPromise(runnable).then(console.log, console.error)
/*
Output:
finalizer after Right
1
*/
```

Next, let's explore how things behave in the event of a failure:

```ts
import * as Micro from "effect/Micro"

const consoleLog = (message?: any, ...optionalParams: Array<any>) =>
  Micro.sync(() => console.log(message, ...optionalParams))

const program = Micro.gen(function* () {
  yield* Micro.addFinalizer((exit) =>
    consoleLog(`finalizer after ${exit._tag}`)
  )
  return yield* Micro.fail("Uh oh!")
})

const runnable = Micro.scoped(program)

Micro.runPromiseExit(runnable).then(console.log)
/*
Output:
finalizer after Left
{ _id: 'Either', _tag: 'Left', left: MicroCause.Fail: Uh oh! }
*/
```

### Defining Resources

```ts
import * as Micro from "effect/Micro"

// Define the interface for the resource
interface MyResource {
  readonly contents: string
  readonly close: () => Promise<void>
}

// Simulate getting the resource
const getMyResource = (): Promise<MyResource> =>
  Promise.resolve({
    contents: "lorem ipsum",
    close: () =>
      new Promise((resolve) => {
        console.log("Resource released")
        resolve()
      })
  })

// Define the acquisition of the resource with error handling
const acquire = Micro.tryPromise({
  try: () =>
    getMyResource().then((res) => {
      console.log("Resource acquired")
      return res
    }),
  catch: () => new Error("getMyResourceError")
})

// Define the release of the resource
const release = (res: MyResource) => Micro.promise(() => res.close())

const resource = Micro.acquireRelease(acquire, release)

const program = Micro.scoped(
  Micro.gen(function* () {
    const res = yield* resource
    console.log(`content is ${res.contents}`)
  })
)

Micro.runPromise(program)
/*
Resource acquired
content is lorem ipsum
Resource released
*/
```

### acquireUseRelease

```ts
import * as Micro from "effect/Micro"

// Define the interface for the resource
interface MyResource {
  readonly contents: string
  readonly close: () => Promise<void>
}

// Simulate getting the resource
const getMyResource = (): Promise<MyResource> =>
  Promise.resolve({
    contents: "lorem ipsum",
    close: () =>
      new Promise((resolve) => {
        console.log("Resource released")
        resolve()
      })
  })

// Define the acquisition of the resource with error handling
const acquire = Micro.tryPromise({
  try: () =>
    getMyResource().then((res) => {
      console.log("Resource acquired")
      return res
    }),
  catch: () => new Error("getMyResourceError")
})

// Define the release of the resource
const release = (res: MyResource) => Micro.promise(() => res.close())

const use = (res: MyResource) =>
  Micro.sync(() => console.log(`content is ${res.contents}`))

const program = Micro.acquireUseRelease(acquire, use, release)

Micro.runPromise(program)
/*
Resource acquired
content is lorem ipsum
Resource released
*/
```

## Scheduling

### repeat

**Success Example**

```ts
import * as Micro from "effect/Micro"

const action = Micro.sync(() => console.log("success"))

const policy = Micro.scheduleAddDelay(Micro.scheduleRecurs(2), () => 100)

const program = Micro.repeat(action, { schedule: policy })

Micro.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
/*
Output:
success
success
success
*/
```

**Failure Example**

```ts
import * as Micro from "effect/Micro"

let count = 0

// Define an async effect that simulates an action with possible failures
const action = Micro.async<string, string>((resume) => {
  if (count > 1) {
    console.log("failure")
    resume(Micro.fail("Uh oh!"))
  } else {
    count++
    console.log("success")
    resume(Micro.succeed("yay!"))
  }
})

const policy = Micro.scheduleAddDelay(Micro.scheduleRecurs(2), () => 100)

const program = Micro.repeat(action, { schedule: policy })

Micro.runPromiseExit(program).then(console.log)
/*
Output:
success
success
failure
{ _id: 'Either', _tag: 'Left', left: MicroCause.Fail: Uh oh! }
*/
```

### helper

```ts
import type * as Micro from "effect/Micro"
import * as Option from "effect/Option"

export const dryRun = (
  schedule: Micro.MicroSchedule,
  maxAttempt: number = 7
): Array<number> => {
  let attempt = 1
  let elapsed = 0
  let duration = schedule(attempt, elapsed)
  const out: Array<number> = []
  while (Option.isSome(duration) && attempt <= maxAttempt) {
    const value = duration.value
    attempt++
    elapsed += value
    out.push(value)
    duration = schedule(attempt, elapsed)
  }
  return out
}
```

### scheduleExponential

```ts
import * as Micro from "effect/Micro"
import { dryRun } from "./dryRun.js"

const policy = Micro.scheduleExponential(10)

console.log(dryRun(policy))
/*
Output:
[
    20,  40,  80,
   160, 320, 640,
  1280
]
*/
```

### scheduleUnion

```ts
import * as Micro from "effect/Micro"
import { dryRun } from "./dryRun.js"

const policy = Micro.scheduleUnion(
  Micro.scheduleExponential(10),
  Micro.scheduleSpaced(300)
)

console.log(dryRun(policy))
/*
Output:
[
   20,  40,  80, 160,
  300, 300, 300
]
*/
```

### scheduleIntersect

```ts
import * as Micro from "effect/Micro"
import { dryRun } from "./dryRun.js"

const policy = Micro.scheduleIntersect(
  Micro.scheduleExponential(10),
  Micro.scheduleSpaced(300)
)

console.log(dryRun(policy))
/*
Output:
[
   300, 300, 300,
   300, 320, 640,
  1280
]
*/
```

### scheduleAndThen

```ts
import * as Micro from "effect/Micro"
import { dryRun } from "./dryRun.js"

const policy = Micro.scheduleAndThen(
  Micro.scheduleRecurs(4),
  Micro.scheduleSpaced(100)
)

console.log(dryRun(policy))
/*
Output:
[
    0,   0,   0, 0,
  100, 100, 100
]
*/
```

## Concurrency

### Forking Effects

```ts
import * as Micro from "effect/Micro"

const fib = (n: number): Micro.Micro<number> =>
  Micro.suspend(() => {
    if (n <= 1) {
      return Micro.succeed(n)
    }
    return fib(n - 1).pipe(Micro.zipWith(fib(n - 2), (a, b) => a + b))
  })

const fib10Fiber = Micro.fork(fib(10))
```

### Joining Fibers

```ts
import * as Micro from "effect/Micro"

const fib = (n: number): Micro.Micro<number> =>
  Micro.suspend(() => {
    if (n <= 1) {
      return Micro.succeed(n)
    }
    return fib(n - 1).pipe(Micro.zipWith(fib(n - 2), (a, b) => a + b))
  })

const fib10Fiber = Micro.fork(fib(10))

const program = Micro.gen(function* () {
  const fiber = yield* fib10Fiber
  const n = yield* fiber.join
  console.log(n)
})

Micro.runPromise(program) // 55
```

### Awaiting Fibers

```ts
import * as Micro from "effect/Micro"

const fib = (n: number): Micro.Micro<number> =>
  Micro.suspend(() => {
    if (n <= 1) {
      return Micro.succeed(n)
    }
    return fib(n - 1).pipe(Micro.zipWith(fib(n - 2), (a, b) => a + b))
  })

const fib10Fiber = Micro.fork(fib(10))

const program = Micro.gen(function* () {
  const fiber = yield* fib10Fiber
  const exit = yield* fiber.await
  console.log(exit)
})

Micro.runPromise(program) // { _id: 'Either', _tag: 'Right', right: 55 }
```

### Interrupting Fibers

```ts
import * as Micro from "effect/Micro"

const program = Micro.gen(function* () {
  const fiber = yield* Micro.fork(Micro.forever(Micro.succeed("Hi!")))
  const exit = yield* fiber.interrupt
  console.log(exit)
})

Micro.runPromise(program)
/*
Output
{
  _id: 'Either',
  _tag: 'Left',
  left: MicroCause.Interrupt: interrupted
}
*/
```

### Racing

The `Micro.race` function lets you race multiple effects concurrently and returns the result of the first one that successfully completes.

```ts
import * as Micro from "effect/Micro"

const task1 = Micro.delay(Micro.fail("task1"), 1_000)
const task2 = Micro.delay(Micro.succeed("task2"), 2_000)

const program = Micro.race(task1, task2)

Micro.runPromise(program).then(console.log)
/*
Output:
task2
*/
```

If you need to handle the first effect to complete, whether it succeeds or fails, you can use the `Micro.either` function.

```ts
import * as Micro from "effect/Micro"

const task1 = Micro.delay(Micro.fail("task1"), 1_000)
const task2 = Micro.delay(Micro.succeed("task2"), 2_000)

const program = Micro.race(Micro.either(task1), Micro.either(task2))

Micro.runPromise(program).then(console.log)
/*
Output:
{ _id: 'Either', _tag: 'Left', left: 'task1' }
*/
```

### Timing out

**Interruptible Operation**: If the operation can be interrupted, it is terminated immediately once the timeout threshold is reached, resulting in a `TimeoutException`.

```ts
import * as Micro from "effect/Micro"

const myEffect = Micro.gen(function* () {
  console.log("Start processing...")
  yield* Micro.sleep(2_000) // Simulates a delay in processing
  console.log("Processing complete.")
  return "Result"
})

const timedEffect = myEffect.pipe(Micro.timeout(1_000))

Micro.runPromiseExit(timedEffect).then(console.log)
/*
Output:
{
  _id: 'Either',
  _tag: 'Left',
  left: (MicroCause.Fail) TimeoutException
      ...stack trace...
}
*/
```

**Uninterruptible Operation**: If the operation is uninterruptible, it continues until completion before the `TimeoutException` is assessed.

```ts
import * as Micro from "effect/Micro"

const myEffect = Micro.gen(function* () {
  console.log("Start processing...")
  yield* Micro.sleep(2_000) // Simulates a delay in processing
  console.log("Processing complete.")
  return "Result"
})

const timedEffect = myEffect.pipe(Micro.uninterruptible, Micro.timeout(1_000))

// Outputs a TimeoutException after the task completes, because the task is uninterruptible
Micro.runPromiseExit(timedEffect).then(console.log)
/*
Output:
Start processing...
Processing complete.
{
  _id: 'Either',
  _tag: 'Left',
  left: (MicroCause.Fail) TimeoutException
      ...stack trace...
}
*/
```

### Interruptions

#### Calling Effect.interrupt

```ts
import * as Micro from "effect/Micro"

const program = Micro.gen(function* () {
  console.log("waiting 1 second")
  yield* Micro.sleep(1_000)
  yield* Micro.interrupt
  console.log("waiting 1 second")
  yield* Micro.sleep(1_000)
  console.log("done")
})

Micro.runPromiseExit(program).then(console.log)
/*
Output:
waiting 1 second
{
  _id: 'Either',
  _tag: 'Left',
  left: MicroCause.Interrupt: interrupted
}
*/
```

#### Interruption of Concurrent Effects

```ts
import * as Micro from "effect/Micro"

const program = Micro.forEach(
  [1, 2, 3],
  (n) =>
    Micro.gen(function* () {
      console.log(`start #${n}`)
      yield* Micro.sleep(n * 1_000)
      if (n > 1) {
        yield* Micro.interrupt
      }
      console.log(`done #${n}`)
    }),
  { concurrency: "unbounded" }
)

Micro.runPromiseExit(program).then((exit) =>
  console.log(JSON.stringify(exit, null, 2))
)
/*
Output:
start #1
start #2
start #3
done #1
{
  "_id": "Either",
  "_tag": "Left",
  "left": {
    "_tag": "Interrupt",
    "traces": [],
    "name": "MicroCause.Interrupt"
  }
}
*/
```
