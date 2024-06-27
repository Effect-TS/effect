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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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
// ---cut---
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

```ts twoslash
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
// ---cut---
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

## Requirements Management

```ts twoslash
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

```ts twoslash
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

### addFinalizer

Let's observe how things behave in the event of success:

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

## Concurrency

### Forking Effects

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

### Timeout

**Interruptible Operation**: If the operation can be interrupted, it is terminated immediately once the timeout threshold is reached, resulting in a `TimeoutException`.

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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

```ts twoslash
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
