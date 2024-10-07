# effect

## 3.9.0

### Minor Changes

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16) Thanks @vinassefranche! - Adds HashMap.HashMap.Entry type helper

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0) Thanks @tim-smart! - add deno support to Inspectable

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd) Thanks @KhraksMamtsov! - `Latch` implements `Effect<void>` with `.await` semantic

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469) Thanks @KhraksMamtsov! - Effect.mapAccum & Array.mapAccum preserve non-emptiness

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6) Thanks @KhraksMamtsov! - `Pool` is now a subtype of `Effect`, equivalent to `Pool.get`

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda) Thanks @mikearnaldi! - Support providing an array of layers via Effect.provide and Layer.provide

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03) Thanks @leonitousconforti! - support ManagedRuntime in Effect.provide

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03) Thanks @leonitousconforti! - `ManagedRuntime<R, E>` is subtype of `Effect<Runtime<R>, E, never>`

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da) Thanks @KhraksMamtsov! - `Tuple.map` transforms each element of tuple using the given function, treating tuple homomorphically

  ```ts
  import { pipe, Tuple } from "effect"

  const result = pipe(
    //  ^? [string, string, string]
    ["a", 1, false] as const,
    T.map((el) => {
      //^? "a" | 1 | false
      return el.toString().toUppercase()
    })
  )
  assert.deepStrictEqual(result, ["A", "1", "FALSE"])
  ```

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186) Thanks @AlexGeb! - Add Array.pad function

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933) Thanks @ianbollinger! - Add an `isRegExp` type guard

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda) Thanks @mikearnaldi! - Implement Effect.Service as a Tag and Layer with Opaque Type.

  Namely the following is now possible:

  ```ts
  class Prefix extends Effect.Service<Prefix>()("Prefix", {
    sync: () => ({
      prefix: "PRE"
    })
  }) {}

  class Postfix extends Effect.Service<Postfix>()("Postfix", {
    sync: () => ({
      postfix: "POST"
    })
  }) {}

  const messages: Array<string> = []

  class Logger extends Effect.Service<Logger>()("Logger", {
    accessors: true,
    effect: Effect.gen(function* () {
      const { prefix } = yield* Prefix
      const { postfix } = yield* Postfix
      return {
        info: (message: string) =>
          Effect.sync(() => {
            messages.push(`[${prefix}][${message}][${postfix}]`)
          })
      }
    }),
    dependencies: [Prefix.Default, Postfix.Default]
  }) {}

  describe("Effect", () => {
    it.effect("Service correctly wires dependencies", () =>
      Effect.gen(function* () {
        const { _tag } = yield* Logger
        expect(_tag).toEqual("Logger")
        yield* Logger.info("Ok")
        expect(messages).toEqual(["[PRE][Ok][POST]"])
        const { prefix } = yield* Prefix
        expect(prefix).toEqual("PRE")
        const { postfix } = yield* Postfix
        expect(postfix).toEqual("POST")
      }).pipe(Effect.provide([Logger.Default, Prefix.Default, Postfix.Default]))
    )
  })
  ```

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6) Thanks @KhraksMamtsov! - `Resource<A, E>` is subtype of `Effect<A, E>`.
  `ScopedRed<A>` is subtype of `Effect<A>`.

### Patch Changes

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984) Thanks @tim-smart! - fix Unify for Deferred

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457) Thanks @leonitousconforti! - move ManagedRuntime.TypeId to fix circular imports

## 3.8.5

### Patch Changes

- [#3734](https://github.com/Effect-TS/effect/pull/3734) [`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232) Thanks @mikearnaldi! - Ensure random numbers are correctly distributed

- [#3717](https://github.com/Effect-TS/effect/pull/3717) [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044) Thanks @mikearnaldi! - Consider async operation in runSync as a defect, add span based stack

- [#3731](https://github.com/Effect-TS/effect/pull/3731) [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110) Thanks @patroza! - Improve DX of type errors from inside `pipe` and `flow`

- [#3699](https://github.com/Effect-TS/effect/pull/3699) [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991) Thanks @jessekelly881! - added Stream.mergeWithTag

  Combines a struct of streams into a single stream of tagged values where the tag is the key of the struct.

  ```ts
  import { Stream } from "effect"

  // Stream.Stream<{ _tag: "a"; value: number; } | { _tag: "b"; value: string; }>
  const stream = Stream.mergeWithTag(
    {
      a: Stream.make(0),
      b: Stream.make("")
    },
    { concurrency: 1 }
  )
  ```

- [#3706](https://github.com/Effect-TS/effect/pull/3706) [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862) Thanks @fubhy! - Made `BigDecimal.scale` dual.

## 3.8.4

### Patch Changes

- [#3661](https://github.com/Effect-TS/effect/pull/3661) [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683) Thanks @KhraksMamtsov! - `Micro.EnvRef` and `Micro.Handle` is subtype of `Micro`

## 3.8.3

### Patch Changes

- [#3644](https://github.com/Effect-TS/effect/pull/3644) [`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4) Thanks @tim-smart! - fix encoding of logs to tracer span events

## 3.8.2

### Patch Changes

- [#3627](https://github.com/Effect-TS/effect/pull/3627) [`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f) Thanks @fubhy! - Revert cron schedule regression

## 3.8.1

### Patch Changes

- [#3624](https://github.com/Effect-TS/effect/pull/3624) [`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334) Thanks @fubhy! - Fixed double firing of cron schedules in cases where the current time matched the initial interval.

- [#3623](https://github.com/Effect-TS/effect/pull/3623) [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6) Thanks @fubhy! - Allow CRLF characters in base64 encoded strings.

## 3.8.0

### Minor Changes

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f) Thanks @Schniz! - add `Logger.withLeveledConsole`

  In browsers and different platforms, `console.error` renders differently than `console.info`. This helps to distinguish between different levels of logging. `Logger.withLeveledConsole` takes any logger and calls the respective `Console` method based on the log level. For instance, `Effect.logError` will call `Console.error` and `Effect.logInfo` will call `Console.info`.

  To use it, you can replace the default logger with a `Logger.withLeveledConsole` logger:

  ```ts
  import { Logger, Effect } from "effect"

  const loggerLayer = Logger.withLeveledConsole(Logger.stringLogger)

  Effect.gen(function* () {
    yield* Effect.logError("an error")
    yield* Effect.logInfo("an info")
  }).pipe(Effect.provide(loggerLayer))
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7) Thanks @KhraksMamtsov! - Made `Ref`, `SynchronizedRed` and `SubscriptionRef` a subtype of `Effect`

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db) Thanks @tim-smart! - add Semaphore.withPermitsIfAvailable

  You can now use `Semaphore.withPermitsIfAvailable` to run an Effect only if the
  Semaphore has enough permits available. This is useful when you want to run an
  Effect only if you can acquire a permit without blocking.

  It will return an `Option.Some` with the result of the Effect if the permits were
  available, or `None` if they were not.

  ```ts
  import { Effect } from "effect"

  Effect.gen(function* () {
    const semaphore = yield* Effect.makeSemaphore(1)
    semaphore.withPermitsIfAvailable(1)(Effect.void)
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5) Thanks @KhraksMamtsov! - The `Deferred<A>` is now a subtype of `Effect<A>`. This change simplifies handling of deferred values, removing the need for explicit call `Deffer.await`.

  ```typescript
  import { Effect, Deferred } from "effect"

  Effect.gen(function* () {
    const deferred = yield* Deferred.make<string>()

    const before = yield* Deferred.await(deferred)
    const after = yield* deferred
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936) Thanks @tim-smart! - add Logger.prettyLoggerDefault, to prevent duplicate pretty loggers

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa) Thanks @tim-smart! - add Effect.makeLatch, for creating a simple async latch

  ```ts
  import { Effect } from "effect"

  Effect.gen(function* () {
    // Create a latch, starting in the closed state
    const latch = yield* Effect.makeLatch(false)

    // Fork a fiber that logs "open sesame" when the latch is opened
    const fiber = yield* Effect.log("open sesame").pipe(
      latch.whenOpen,
      Effect.fork
    )

    // Open the latch
    yield* latch.open
    yield* fiber.await
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7) Thanks @KhraksMamtsov! - `Dequeue<A>` and `Queue<A>` is subtype of `Effect<A>`. This means that now it can be used as an `Effect`, and when called, it will automatically extract and return an item from the queue, without having to explicitly use the `Queue.take` function.

  ```ts
  Effect.gen(function* () {
    const queue = yield* Queue.unbounded<number>()
    yield* Queue.offer(queue, 1)
    yield* Queue.offer(queue, 2)
    const oldWay = yield* Queue.take(queue)
    const newWay = yield* queue
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305) Thanks @vinassefranche! - Add Number.round

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be) Thanks @fubhy! - Add additional `Duration` conversion apis

  - `Duration.toMinutes`
  - `Duration.toHours`
  - `Duration.toDays`
  - `Duration.toWeeks`

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25) Thanks @KhraksMamtsov! - The `Fiber<A, E>` is now a subtype of `Effect<A, E>`. This change removes the need for explicit call `Fiber.join`.

  ```typescript
  import { Effect, Fiber } from "effect"

  Effect.gen(function*() {
    const fiber = yield* Effect.fork(Effect.succeed(1))

    const oldWay = yield* Fiber.join(fiber)
    const now = yield* fiber
  }))
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f) Thanks @dilame! - add `Stream.share` api

  The `Stream.share` api is a ref counted variant of the broadcast apis.

  It allows you to share a stream between multiple consumers, and will close the
  upstream when the last consumer ends.

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754) Thanks @tim-smart! - add Mailbox module, a queue which can have done or failure signals

  ```ts
  import { Chunk, Effect, Mailbox } from "effect"
  import * as assert from "node:assert"

  Effect.gen(function* () {
    const mailbox = yield* Mailbox.make<number, string>()

    // add messages to the mailbox
    yield* mailbox.offer(1)
    yield* mailbox.offer(2)
    yield* mailbox.offerAll([3, 4, 5])

    // take messages from the mailbox
    const [messages, done] = yield* mailbox.takeAll
    assert.deepStrictEqual(Chunk.toReadonlyArray(messages), [1, 2, 3, 4, 5])
    assert.strictEqual(done, false)

    // signal that the mailbox is done
    yield* mailbox.end
    const [messages2, done2] = yield* mailbox.takeAll
    assert.deepStrictEqual(messages2, Chunk.empty())
    assert.strictEqual(done2, true)

    // signal that the mailbox is failed
    yield* mailbox.fail("boom")
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd) Thanks @mikearnaldi! - Cache some fiber references in the runtime to optimize reading in hot-paths

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36) Thanks @fubhy! - Added `RcMap.keys` and `MutableHashMap.keys`.

  These functions allow you to get a list of keys currently stored in the underlying hash map.

  ```ts
  const map = MutableHashMap.make([
    ["a", "a"],
    ["b", "b"],
    ["c", "c"]
  ])
  const keys = MutableHashMap.keys(map) // ["a", "b", "c"]
  ```

  ```ts
  Effect.gen(function* () {
    const map = yield* RcMap.make({
      lookup: (key) => Effect.succeed(key)
    })

    yield* RcMap.get(map, "a")
    yield* RcMap.get(map, "b")
    yield* RcMap.get(map, "c")

    const keys = yield* RcMap.keys(map) // ["a", "b", "c"]
  })
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913) Thanks @fubhy! - Add `Duration.parts` api

  ```ts
  const parts = Duration.parts(Duration.sum("5 minutes", "20 seconds"))
  assert.equal(parts.minutes, 5)
  assert.equal(parts.seconds, 20)
  ```

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e) Thanks @KhraksMamtsov! - The `FiberRef<A>` is now a subtype of `Effect<A>`. This change simplifies handling of deferred values, removing the need for explicit call `FiberRef.get`.

  ```typescript
  import { Effect, FiberRef } from "effect"

  Effect.gen(function* () {
    const fiberRef = yield* FiberRef.make("value")

    const before = yield* FiberRef.get(fiberRef)
    const after = yield* fiberRef
  })
  ```

## 3.7.3

### Patch Changes

- [#3592](https://github.com/Effect-TS/effect/pull/3592) [`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be) Thanks @mikearnaldi! - TestClock yield with setTimeout(0)

## 3.7.2

### Patch Changes

- [#3548](https://github.com/Effect-TS/effect/pull/3548) [`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9) Thanks @tim-smart! - remove console.log statements from Micro

- [#3546](https://github.com/Effect-TS/effect/pull/3546) [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7) Thanks @tim-smart! - fix exported Stream types for `broadcast*` and `toPubSub`

## 3.7.1

### Patch Changes

- [#3536](https://github.com/Effect-TS/effect/pull/3536) [`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff) Thanks @mikearnaldi! - Optimize Array.sortWith to avoid calling the map function excesively

- [#3516](https://github.com/Effect-TS/effect/pull/3516) [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5) Thanks @KhraksMamtsov! - support tacit usage for `Effect.tapErrorTag` and `Effect.catchTag`

- [#3543](https://github.com/Effect-TS/effect/pull/3543) [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1) Thanks @datner! - Align behavior of `Stream.empty` to act like `Stream.make()` to fix behavior with `NodeStream.toReadable`

- [#3545](https://github.com/Effect-TS/effect/pull/3545) [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed) Thanks @tim-smart! - fix Micro.forEach for empty iterables

## 3.7.0

### Minor Changes

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92) Thanks @vinassefranche! - preserve `Array.modify` `Array.modifyOption` non emptiness

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9) Thanks @patroza! - improve: type Fiber.awaitAll as Exit<A, E>[].

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922) Thanks @titouancreach! - New constructor Config.nonEmptyString

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc) Thanks @KhraksMamtsov! - preserve `Array.replace` `Array.replaceOption` non emptiness

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d) Thanks @KhraksMamtsov! - add `Effect.bindAll` api

  This api allows you to combine `Effect.all` with `Effect.bind`. It is useful
  when you want to concurrently run multiple effects and then combine their
  results in a Do notation pipeline.

  ```ts
  import { Effect } from "effect"

  const result = Effect.Do.pipe(
    Effect.bind("x", () => Effect.succeed(2)),
    Effect.bindAll(
      ({ x }) => ({
        a: Effect.succeed(x + 1),
        b: Effect.succeed("foo")
      }),
      { concurrency: 2 }
    )
  )
  assert.deepStrictEqual(Effect.runSync(result), {
    x: 2,
    a: 3,
    b: "foo"
  })
  ```

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4) Thanks @tim-smart! - add `propagateInterruption` option to Fiber{Handle,Set,Map}

  This option will send any external interrupts to the .join result.

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474) Thanks @dilame! - feat(Stream): implement `race` operator, which accepts two upstreams and returns a stream that mirrors the first upstream to emit an item and interrupts the other upstream.

  ```ts
  import { Stream, Schedule, Console, Effect } from "effect"

  const stream = Stream.fromSchedule(Schedule.spaced("2 millis")).pipe(
    Stream.race(Stream.fromSchedule(Schedule.spaced("1 millis"))),
    Stream.take(6),
    Stream.tap((n) => Console.log(n))
  )

  Effect.runPromise(Stream.runDrain(stream))
  // Output each millisecond from the first stream, the rest streams are interrupted
  // 0
  // 1
  // 2
  // 3
  // 4
  // 5
  ```

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb) Thanks @mikearnaldi! - Avoid automatic propagation of finalizer concurrency, closes #3440

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f) Thanks @tim-smart! - add Context.getOrElse api, for gettings a Tag's value with a fallback

### Patch Changes

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe) Thanks @juliusmarminge! - add `Micro.isMicroCause` guard

## 3.6.8

### Patch Changes

- [#3510](https://github.com/Effect-TS/effect/pull/3510) [`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d) Thanks @fubhy! - Detect environment in Logger.pretty using process.stdout

## 3.6.7

### Patch Changes

- [#3504](https://github.com/Effect-TS/effect/pull/3504) [`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc) Thanks @datner! - improve the performance of Effect.partitionMap

## 3.6.6

### Patch Changes

- [#3306](https://github.com/Effect-TS/effect/pull/3306) [`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf) Thanks @dilame! - Introduce left / right naming for Stream apis

- [#3499](https://github.com/Effect-TS/effect/pull/3499) [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320) Thanks @tim-smart! - fix nested Config.array, by ensuring path patches aren't applied twice in sequences

## 3.6.5

### Patch Changes

- [#3474](https://github.com/Effect-TS/effect/pull/3474) [`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b) Thanks @IMax153! - Add support for incrementing and decrementing a gauge based on its prior value

- [#3490](https://github.com/Effect-TS/effect/pull/3490) [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae) Thanks @tim-smart! - fix type error when .pipe() has no arguments

## 3.6.4

### Patch Changes

- [#3404](https://github.com/Effect-TS/effect/pull/3404) [`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b) Thanks @KhraksMamtsov! - Fix `Cache<_, Value, _>` type parameter variance (covariant -> invariant)

- [#3452](https://github.com/Effect-TS/effect/pull/3452) [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c) Thanks @tim-smart! - ensure Scheduler tasks are added to a matching priority bucket

- [#3459](https://github.com/Effect-TS/effect/pull/3459) [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63) Thanks @tim-smart! - ensure defects are caught in Effect.tryPromise

- [#3458](https://github.com/Effect-TS/effect/pull/3458) [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4) Thanks @thomasvargiu! - fix `DateTime.makeZonedFromString` for 0 offset

## 3.6.3

### Patch Changes

- [#3444](https://github.com/Effect-TS/effect/pull/3444) [`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf) Thanks @tim-smart! - ensure Stream.toReadableStream pulls always result in a enqueue

## 3.6.2

### Patch Changes

- [#3435](https://github.com/Effect-TS/effect/pull/3435) [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c) Thanks @Andarist! - ensure fiber is properly cleared in FiberHandle.unsafeSet

## 3.6.1

### Patch Changes

- [#3405](https://github.com/Effect-TS/effect/pull/3405) [`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6) Thanks @KhraksMamtsov! - Fix `Effect.repeat` with times option returns wrong value

- [#3398](https://github.com/Effect-TS/effect/pull/3398) [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978) Thanks @sukovanej! - Fix `Stream.asyncPush` type signature - allow the `register` effect to fail.

## 3.6.0

### Minor Changes

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc) Thanks @tim-smart! - make List.Cons extend NonEmptyIterable

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520) Thanks @tim-smart! - add DateTime module

  The `DateTime` module provides functionality for working with time, including
  support for time zones and daylight saving time.

  It has two main data types: `DateTime.Utc` and `DateTime.Zoned`.

  A `DateTime.Utc` represents a time in Coordinated Universal Time (UTC), and
  a `DateTime.Zoned` contains both a UTC timestamp and a time zone.

  There is also a `CurrentTimeZone` service, for setting a time zone contextually.

  ```ts
  import { DateTime, Effect } from "effect"

  Effect.gen(function* () {
    // Get the current time in the current time zone
    const now = yield* DateTime.nowInCurrentZone

    // Math functions are included
    const tomorrow = DateTime.add(now, 1, "day")

    // Convert to a different time zone
    // The UTC portion of the `DateTime` is preserved and only the time zone is
    // changed
    const sydneyTime = tomorrow.pipe(
      DateTime.unsafeSetZoneNamed("Australia/Sydney")
    )
  }).pipe(DateTime.withCurrentZoneNamed("America/New_York"))
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987) Thanks @tim-smart! - add Stream.asyncPush api

  This api creates a stream from an external push-based resource.

  You can use the `emit` helper to emit values to the stream. You can also use
  the `emit` helper to signal the end of the stream by using apis such as
  `emit.end` or `emit.fail`.

  By default it uses an "unbounded" buffer size.
  You can customize the buffer size and strategy by passing an object as the
  second argument with the `bufferSize` and `strategy` fields.

  ```ts
  import { Effect, Stream } from "effect"

  Stream.asyncPush<string>(
    (emit) =>
      Effect.acquireRelease(
        Effect.gen(function* () {
          yield* Effect.log("subscribing")
          return setInterval(() => emit.single("tick"), 1000)
        }),
        (handle) =>
          Effect.gen(function* () {
            yield* Effect.log("unsubscribing")
            clearInterval(handle)
          })
      ),
    { bufferSize: 16, strategy: "dropping" }
  )
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603) Thanks @mikearnaldi! - Implement Struct.keys as a typed alternative to Object.keys

  ```ts
  import { Struct } from "effect"

  const symbol: unique symbol = Symbol()

  const value = {
    a: 1,
    b: 2,
    [symbol]: 3
  }

  const keys: Array<"a" | "b"> = Struct.keys(value)
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085) Thanks @sukovanej! - Add `Random.choice`.

  ```ts
  import { Random } from "effect"

  Effect.gen(function* () {
    const randomItem = yield* Random.choice([1, 2, 3])
    console.log(randomItem)
  })
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182) Thanks @vinassefranche! - Add onlyEffect option to Effect.tap

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e) Thanks @KhraksMamtsov! - Support `Refinement` in `Predicate.tuple` and `Predicate.struct`

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316) Thanks @dilame! - Implement `Stream.onEnd` that adds an effect to be executed at the end of the stream.

  ```ts
  import { Console, Effect, Stream } from "effect"

  const stream = Stream.make(1, 2, 3).pipe(
    Stream.map((n) => n * 2),
    Stream.tap((n) => Console.log(`after mapping: ${n}`)),
    Stream.onEnd(Console.log("Stream ended"))
  )

  Effect.runPromise(Stream.runCollect(stream)).then(console.log)
  // after mapping: 2
  // after mapping: 4
  // after mapping: 6
  // Stream ended
  // { _id: 'Chunk', values: [ 2, 4, 6 ] }
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec) Thanks @dilame! - Implement `Stream.onStart` that adds an effect to be executed at the start of the stream.

  ```ts
  import { Console, Effect, Stream } from "effect"

  const stream = Stream.make(1, 2, 3).pipe(
    Stream.onStart(Console.log("Stream started")),
    Stream.map((n) => n * 2),
    Stream.tap((n) => Console.log(`after mapping: ${n}`))
  )

  Effect.runPromise(Stream.runCollect(stream)).then(console.log)
  // Stream started
  // after mapping: 2
  // after mapping: 4
  // after mapping: 6
  // { _id: 'Chunk', values: [ 2, 4, 6 ] }
  ```

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987) Thanks @tim-smart! - add `bufferSize` option to Stream.fromEventListener

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285) Thanks @fubhy! - Changed various function signatures to return `Array` instead of `ReadonlyArray`

## 3.5.9

### Patch Changes

- [#3377](https://github.com/Effect-TS/effect/pull/3377) [`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e) Thanks @tim-smart! - add MicroScheduler to Micro module

- [#3362](https://github.com/Effect-TS/effect/pull/3362) [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942) Thanks @IMax153! - Add `Service` and `Identifier` to `Context.Tag`.

  These helpers can be used, for example, to extract the service shape from a tag:

  ```ts
  import * as Context from "effect/Context"

  export class Foo extends Context.Tag("Foo")<
    Foo,
    {
      readonly foo: Effect.Effect<void>
    }
  >() {}

  type ServiceShape = typeof Foo.Service
  ```

- [#3373](https://github.com/Effect-TS/effect/pull/3373) [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273) Thanks @KhraksMamtsov! - Add test for Hash.number(0.1) !== Has.number(0)

## 3.5.8

### Patch Changes

- [#3345](https://github.com/Effect-TS/effect/pull/3345) [`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef) Thanks @mikearnaldi! - Fix typo propety to property

- [#3349](https://github.com/Effect-TS/effect/pull/3349) [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c) Thanks @tim-smart! - ensure all Data.Error arguments are preserved in .toJSON

- [#3355](https://github.com/Effect-TS/effect/pull/3355) [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231) Thanks @tim-smart! - fix Hash.number not returning unique values

## 3.5.7

### Patch Changes

- [#3288](https://github.com/Effect-TS/effect/pull/3288) [`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5) Thanks @mikearnaldi! - Forbid usage of property "name" in Effect.Tag

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

## 3.5.6

### Patch Changes

- [#3294](https://github.com/Effect-TS/effect/pull/3294) [`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c) Thanks @tim-smart! - correctly exclude symbols from Record.keys

- [#3289](https://github.com/Effect-TS/effect/pull/3289) [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60) Thanks @dilame! - Changed `Stream.groupByKey`/`Stream.grouped`/`Stream.groupedWithin` JSDoc category from `utils` to `grouping`

- [#3295](https://github.com/Effect-TS/effect/pull/3295) [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398) Thanks @tim-smart! - fix YieldableError rendering on bun

## 3.5.5

### Patch Changes

- [#3266](https://github.com/Effect-TS/effect/pull/3266) [`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39) Thanks @tim-smart! - use "unbounded" buffer for Stream.fromEventListener

## 3.5.4

### Patch Changes

- [#3253](https://github.com/Effect-TS/effect/pull/3253) [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e) Thanks @tim-smart! - update dependencies

- [#3247](https://github.com/Effect-TS/effect/pull/3247) [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498) Thanks @tim-smart! - if performance.timeOrigin is 0, use performance.now() directly in Clock

  This is a workaround for cloudflare, where performance.now() cannot be used in
  the global scope to calculate the origin.

- [#3259](https://github.com/Effect-TS/effect/pull/3259) [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b) Thanks @IMax153! - expose `Channel.isChannel`

- [#3250](https://github.com/Effect-TS/effect/pull/3250) [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c) Thanks @gcanti! - add support for `Refinement`s to `Predicate.or`, closes #3243

  ```ts
  import { Predicate } from "effect"

  // Refinement<unknown, string | number>
  const isStringOrNumber = Predicate.or(Predicate.isString, Predicate.isNumber)
  ```

- [#3246](https://github.com/Effect-TS/effect/pull/3246) [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3) Thanks @tim-smart! - render nested causes in Cause.pretty

## 3.5.3

### Patch Changes

- [#3234](https://github.com/Effect-TS/effect/pull/3234) [`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217) Thanks @tim-smart! - do not add a error "cause" if the upstream error does not contain one

- [#3236](https://github.com/Effect-TS/effect/pull/3236) [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83) Thanks @tim-smart! - set Logger.pretty message color to deepskyblue on browsers

- [#3240](https://github.com/Effect-TS/effect/pull/3240) [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68) Thanks @tim-smart! - fix process .isTTY detection

- [#3230](https://github.com/Effect-TS/effect/pull/3230) [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1) Thanks @KhraksMamtsov! - support heterogenous argument in `Option.firstSomeOf`

- [#3238](https://github.com/Effect-TS/effect/pull/3238) [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d) Thanks @leonitousconforti! - Align Stream.run public function signatures

## 3.5.2

### Patch Changes

- [#3228](https://github.com/Effect-TS/effect/pull/3228) [`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8) Thanks @IMax153! - Render a more helpful error message when timing out an effect

- [#3235](https://github.com/Effect-TS/effect/pull/3235) [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5) Thanks @tim-smart! - improve safari support for Logger.pretty

- [#3235](https://github.com/Effect-TS/effect/pull/3235) [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5) Thanks @tim-smart! - fix span stack rendering when stack function returns undefined

- [#3235](https://github.com/Effect-TS/effect/pull/3235) [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5) Thanks @tim-smart! - align UnsafeConsole group types with web apis

## 3.5.1

### Patch Changes

- [#3220](https://github.com/Effect-TS/effect/pull/3220) [`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837) Thanks @tim-smart! - fix Logger.pretty on bun

## 3.5.0

### Minor Changes

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce) Thanks @tim-smart! - add renderErrorCause option to Cause.pretty

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4) Thanks @tim-smart! - add RcRef module

  An `RcRef` wraps a reference counted resource that can be acquired and released multiple times.

  The resource is lazily acquired on the first call to `get` and released when the last reference is released.

  ```ts
  import { Effect, RcRef } from "effect"

  Effect.gen(function* () {
    const ref = yield* RcRef.make({
      acquire: Effect.acquireRelease(Effect.succeed("foo"), () =>
        Effect.log("release foo")
      )
    })

    // will only acquire the resource once, and release it
    // when the scope is closed
    yield* RcRef.get(ref).pipe(Effect.andThen(RcRef.get(ref)), Effect.scoped)
  })
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2) Thanks @tim-smart! - allowing customizing Stream pubsub strategy

  ```ts
  import { Schedule, Stream } from "effect"

  // toPubSub
  Stream.fromSchedule(Schedule.spaced(1000)).pipe(
    Stream.toPubSub({
      capacity: 16, // or "unbounded"
      strategy: "dropping" // or "sliding" / "suspend"
    })
  )

  // also for the broadcast apis
  Stream.fromSchedule(Schedule.spaced(1000)).pipe(
    Stream.broadcastDynamic({
      capacity: 16,
      strategy: "dropping"
    })
  )
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4) Thanks @tim-smart! - add Duration.isZero, for checking if a Duration is zero

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b) Thanks @sukovanej! - Add `Success` type util for `Config`.

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3) Thanks @tim-smart! - add Logger.prettyLogger and Logger.pretty

  `Logger.pretty` is a new logger that leverages the features of the `console` APIs to provide a more visually appealing output.

  To try it out, provide it to your program:

  ```ts
  import { Effect, Logger } from "effect"

  Effect.log("Hello, World!").pipe(Effect.provide(Logger.pretty))
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce) Thanks @tim-smart! - add .groupCollapsed to UnsafeConsole

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0) Thanks @giacomoran! - export Random.make taking hashable values as seed

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df) Thanks @tim-smart! - add `replay` option to PubSub constructors

  This option adds a replay buffer in front of the given PubSub. The buffer will
  replay the last `n` messages to any new subscriber.

  ```ts
  Effect.gen(function*() {
    const messages = [1, 2, 3, 4, 5]
    const pubsub = yield* PubSub.bounded<number>({ capacity: 16, replay: 3 })
    yield* PubSub.publishAll(pubsub, messages)
    const sub = yield* PubSub.subscribe(pubsub)
    assert.deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [3, 4, 5])
  }))
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4) Thanks @tim-smart! - add RcMap module

  An `RcMap` can contain multiple reference counted resources that can be indexed
  by a key. The resources are lazily acquired on the first call to `get` and
  released when the last reference is released.

  Complex keys can extend `Equal` and `Hash` to allow lookups by value.

  ```ts
  import { Effect, RcMap } from "effect"

  Effect.gen(function* () {
    const map = yield* RcMap.make({
      lookup: (key: string) =>
        Effect.acquireRelease(Effect.succeed(`acquired ${key}`), () =>
          Effect.log(`releasing ${key}`)
        )
    })

    // Get "foo" from the map twice, which will only acquire it once
    // It will then be released once the scope closes.
    yield* RcMap.get(map, "foo").pipe(
      Effect.andThen(RcMap.get(map, "foo")),
      Effect.scoped
    )
  })
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114) Thanks @dilame! - Ensure `Scope` is excluded from `R` in the `Channel` / `Stream` `run*` functions.

  This fix ensures that `Scope` is now properly excluded from the resulting effect environment.
  The affected functions include `run`, `runCollect`, `runCount`, `runDrain` and other non-scoped `run*` in both `Stream` and `Channel` modules.
  This fix brings the type declaration in line with the runtime implementation.

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93) Thanks @dilame! - refactor(Stream/mergeLeft): rename `self`/`that` argument names to `left`/`right` for clarity

  refactor(Stream/mergeRight): rename `self`/`that` argument names to `left`/`right` for clarity

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498) Thanks @dilame! - feat(Stream): implement "raceAll" operator, which returns a stream that mirrors the first source stream to emit an item.

  ```ts
  import { Stream, Schedule, Console, Effect } from "effect"

  const stream = Stream.raceAll(
    Stream.fromSchedule(Schedule.spaced("1 millis")),
    Stream.fromSchedule(Schedule.spaced("2 millis")),
    Stream.fromSchedule(Schedule.spaced("4 millis"))
  ).pipe(Stream.take(6), Stream.tap(Console.log))

  Effect.runPromise(Stream.runDrain(stream))
  // Output only from the first stream, the rest streams are interrupted
  // 0
  // 1
  // 2
  // 3
  // 4
  // 5
  ```

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6) Thanks @dilame! - refactor(Stream): use new built-in `Types.TupleOf` instead of `Stream.DynamicTuple` and deprecate it

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6) Thanks @tim-smart! - support ErrorOptions in YieldableError constructor

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d) Thanks @tim-smart! - allow customizing the output buffer for the Stream.async\* apis

  ```ts
  import { Stream } from "effect"

  Stream.async<string>(
    (emit) => {
      // ...
    },
    {
      bufferSize: 16,
      strategy: "dropping" // you can also use "sliding" or "suspend"
    }
  )
  ```

### Patch Changes

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce) Thanks @tim-smart! - include Error.cause stack in log output

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce) Thanks @tim-smart! - set stackTraceLimit to 1 in PrettyError to address performance issues

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6) Thanks @tim-smart! - ensure "cause" is rendered in Data.Error output

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3) Thanks @tim-smart! - fix types of UnsafeConsole.group

## 3.4.9

### Patch Changes

- [#3210](https://github.com/Effect-TS/effect/pull/3210) [`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee) Thanks @tim-smart! - prevent reclaim of manually invalidated pool items

- [#3204](https://github.com/Effect-TS/effect/pull/3204) [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb) Thanks @gcanti! - Updated the JSDocs for the `Stream` module by adding examples to key functions.

- [#3202](https://github.com/Effect-TS/effect/pull/3202) [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef) Thanks @tim-smart! - allow invalidated Pool items to be reclaimed with usage strategy

## 3.4.8

### Patch Changes

- [#3181](https://github.com/Effect-TS/effect/pull/3181) [`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419) Thanks @KhraksMamtsov! - refactor `TrimEnd` & `TrimStart`

- [#3176](https://github.com/Effect-TS/effect/pull/3176) [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a) Thanks @tim-smart! - allow Stream run fiber to close before trying to interrupt it

- [#3175](https://github.com/Effect-TS/effect/pull/3175) [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c) Thanks @tim-smart! - ensure fibers are interrupted in Stream.mergeWith

## 3.4.7

### Patch Changes

- [#3161](https://github.com/Effect-TS/effect/pull/3161) [`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b) Thanks @tim-smart! - ensure PubSub.publishAll does not increase size while there are no subscribers

## 3.4.6

### Patch Changes

- [#3096](https://github.com/Effect-TS/effect/pull/3096) [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030) Thanks @gcanti! - Micro: align with `Effect` module (renamings and new combinators).

  General naming convention rule: `<reference module (start with lowercase)><api (start with Uppercase)>`.

  - `Failure` -> `MicroCause`
    - `Failure.Expected<E>` -> `MicroCause.Fail<E>`
    - `Failure.Unexpected` -> `MicroCause.Die`
    - `Failure.Aborted` -> `MicroCause.Interrupt`
    - `FailureExpected` -> `causeFail`
    - `FailureUnexpected` -> `causeDie`
    - `FailureAborted` -> `causeInterrupt`
    - `failureIsExpected` -> `causeIsFail`
    - `failureIsExpected` -> `causeIsFail`
    - `failureIsUnexpected` -> `causeIsDie`
    - `failureIsAborted` -> `causeIsInterrupt`
    - `failureSquash` -> `causeSquash`
    - `failureWithTrace` -> `causeWithTrace`
  - `Result` -> `MicroExit`
    - `ResultAborted` -> `exitInterrupt`
    - `ResultSuccess` -> `exitSucceed`
    - `ResultFail` -> `exitFail`
    - `ResultFailUnexpected` -> `exitDie`
    - `ResultFailWith` -> `exitFailCause`
    - `resultIsSuccess` -> `exitIsSuccess`
    - `resultIsFailure` -> `exitIsFailure`
    - `resultIsAborted` -> `exitIsInterrupt`
    - `resultIsFailureExpected` -> `exitIsFail`
    - `resultIsFailureUnexpected` -> `exitIsDie`
    - `resultVoid` -> `exitVoid`
  - `DelayFn` -> `MicroSchedule`
    - `delayExponential` -> `scheduleExponential`
    - `delaySpaced` -> `scheduleSpaced`
    - `delayWithMax` -> `scheduleWithMaxDelay`
    - `delayWithMaxElapsed` -> `scheduleWithMaxElapsed`
    - `delayWithRecurs` -> `scheduleRecurs` and make it a constructor
    - add `scheduleAddDelay` combinator
    - add `scheduleUnion` combinator
    - add `scheduleIntersect` combinator
  - `Handle`
    - `abort` -> `interrupt`
    - `unsafeAbort` -> `unsafeInterrupt`
  - `provideServiceMicro` -> `provideServiceEffect`
  - `fromResult` -> `fromExit`
  - `fromResultSync` -> `fromExitSync`
  - `failWith` -> `failCause`
  - `failWithSync` -> `failCauseSync`
  - `asResult` -> `exit`
  - `filterOrFailWith` -> `filterOrFailCause`
  - `repeatResult` -> `repeatExit`
  - `catchFailure` -> `catchAllCause`
  - `catchFailureIf` -> `catchCauseIf`
  - `catchExpected` -> `catchAll`
  - `catchUnexpected` -> `catchAllDefect`
  - `tapFailure` -> `tapErrorCause`
  - `tapFailureIf` -> `tapErrorCauseIf`
  - `tapExpected` -> `tapError`
  - `tapUnexpected` -> `tapDefect`
  - `mapFailure` -> `mapErrorCause`
  - `matchFailureMicro` -> `matchCauseEffect`
  - `matchFailure` -> `matchCause`
  - `matchMicro` -> `matchEffect`
  - `onResult` -> `onExit`
  - `onResultIf` -> `onExitIf`
  - `onFailure` -> `onError`
  - `onAbort` -> `onInterrupt`
  - `abort` -> `interrupt`
  - `runPromiseResult` -> `runPromiseExit`
  - `runSyncResult` -> `runSyncExit`
  - rename `delay` option to `schedule`

- [#3096](https://github.com/Effect-TS/effect/pull/3096) [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030) Thanks @gcanti! - Micro: rename `timeout` to `timeoutOption`, and add a `timeout` that fails with a `TimeoutException`

- [#3121](https://github.com/Effect-TS/effect/pull/3121) [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7) Thanks @KhraksMamtsov! - Support for the tacit usage of external handlers for `Match.tag` and `Match.tagStartsWith` functions

  ```ts
  type Value = { _tag: "A"; a: string } | { _tag: "B"; b: number }
  const handlerA = (_: { _tag: "A"; a: number }) => _.a

  // $ExpectType string | number
  pipe(
    M.type<Value>(),
    M.tag("A", handlerA), // <-- no type issue
    M.orElse((_) => _.b)
  )(value)
  ```

- [#3096](https://github.com/Effect-TS/effect/pull/3096) [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030) Thanks @gcanti! - Micro: move MicroExit types to a namespace

- [#3134](https://github.com/Effect-TS/effect/pull/3134) [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83) Thanks @tim-smart! - use Channel.acquireUseRelease for Channel.withSpan

## 3.4.5

### Patch Changes

- [#3099](https://github.com/Effect-TS/effect/pull/3099) [`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91) Thanks @tim-smart! - fix using unions with Match.withReturnType

## 3.4.4

### Patch Changes

- [#3083](https://github.com/Effect-TS/effect/pull/3083) [`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b) Thanks @gcanti! - Micro: add `NoSuchElementException` error and update `fromOption` to change the failure type from `Option.None<never>` to `NoSuchElementException`

- [#3095](https://github.com/Effect-TS/effect/pull/3095) [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9) Thanks @tim-smart! - remove global AbortController from Micro

- [#3085](https://github.com/Effect-TS/effect/pull/3085) [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c) Thanks @gcanti! - Micro: add `zipWith`

## 3.4.3

### Patch Changes

- [#3065](https://github.com/Effect-TS/effect/pull/3065) [`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365) Thanks @KhraksMamtsov! - Support `this` argument for `Micro.gen`

- [#3067](https://github.com/Effect-TS/effect/pull/3067) [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7) Thanks @KhraksMamtsov! - Cleanup signal "abort" event handler in `Micro.runFork`

- [#3082](https://github.com/Effect-TS/effect/pull/3082) [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb) Thanks @gcanti! - Align the `Micro.catchIf` signature with `Effect.catchIf`

- [#3078](https://github.com/Effect-TS/effect/pull/3078) [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6) Thanks @KhraksMamtsov! - Support unification for Micro module

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

## 3.4.2

### Patch Changes

- [#3062](https://github.com/Effect-TS/effect/pull/3062) [`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f) Thanks @KhraksMamtsov! - Reuse centralized do-notation code

## 3.4.1

### Patch Changes

- [#3056](https://github.com/Effect-TS/effect/pull/3056) [`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a) Thanks @gcanti! - add missing `TypeLambda` to `Micro` module

## 3.4.0

### Minor Changes

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b) Thanks @LaureRC! - Make Option.liftPredicate dual

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f) Thanks @LaureRC! - Add Effect.liftPredicate

  `Effect.liftPredicate` transforms a `Predicate` function into an `Effect` returning the input value if the predicate returns `true` or failing with specified error if the predicate fails.

  ```ts
  import { Effect } from "effect"

  const isPositive = (n: number): boolean => n > 0

  // succeeds with `1`
  Effect.liftPredicate(1, isPositive, (n) => `${n} is not positive`)

  // fails with `"0 is not positive"`
  Effect.liftPredicate(0, isPositive, (n) => `${n} is not positive`)
  ```

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06) Thanks @tim-smart! - add EventListener type to Stream to avoid use of dom lib

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7) Thanks @gcanti! - Add `lastNonEmpty` function to `Chunk` module, closes #2946

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667) Thanks @dilame! - feat(Stream): implement Success, Error, Context type accessors

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848) Thanks @tim-smart! - add Micro module

  A lightweight alternative to Effect, for when bundle size really matters.

  At a minimum, Micro adds 5kb gzipped to your bundle, and scales with the amount
  of features you use.

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98) Thanks @gcanti! - add `ManagedRuntime` type utils (`Context`, and `Error`)

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf) Thanks @LaureRC! - Add Either.liftPredicate

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7) Thanks @msensys! - Add `Tuple.at` api, to retrieve an element at a specified index from a tuple.

  ```ts
  import { Tuple } from "effect"

  assert.deepStrictEqual(Tuple.at([1, "hello", true], 1), "hello")
  ```

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f) Thanks @datner! - add `ensure` util for Array, used to normalize `A | ReadonlyArray<A>`

  ```ts
  import { ensure } from "effect/Array"

  // lets say you are not 100% sure if it's a member or a collection
  declare const someValue: { foo: string } | Array<{ foo: string }>

  // $ExpectType ({ foo: string })[]
  const normalized = ensure(someValue)
  ```

## 3.3.5

### Patch Changes

- [#3012](https://github.com/Effect-TS/effect/pull/3012) [`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7) Thanks @tim-smart! - ensure Config.Wrap only destructures plain objects

## 3.3.4

### Patch Changes

- [#3001](https://github.com/Effect-TS/effect/pull/3001) [`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352) Thanks @tim-smart! - use Math.random for Hash.random

## 3.3.3

### Patch Changes

- [#2999](https://github.com/Effect-TS/effect/pull/2999) [`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad) Thanks @KhraksMamtsov! - Added tests for `Chunk.toArray` and `Chunk.toReadonlyArray` with use cases in the `pipe`

- [#3000](https://github.com/Effect-TS/effect/pull/3000) [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d) Thanks @tim-smart! - fix support for Predicates in Predicate.compose

## 3.3.2

### Patch Changes

- [#2981](https://github.com/Effect-TS/effect/pull/2981) [`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd) Thanks @tim-smart! - ensure multiline error messages are preserved in cause rendering

- [#2970](https://github.com/Effect-TS/effect/pull/2970) [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85) Thanks @gcanti! - Updated `Chunk.toArray` and `Chunk.toReadonlyArray`. Improved function signatures to preserve non-empty status of chunks during conversion.

- [#2977](https://github.com/Effect-TS/effect/pull/2977) [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2) Thanks @tim-smart! - fix discard option in Effect.all

- [#2917](https://github.com/Effect-TS/effect/pull/2917) [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d) Thanks @mikearnaldi! - Fix Unify for Stream

## 3.3.1

### Patch Changes

- [#2952](https://github.com/Effect-TS/effect/pull/2952) [`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612) Thanks @KhraksMamtsov! - Change `Config.array` to return `Array<A>` instead of `ReadonlyArray<A>`

- [#2950](https://github.com/Effect-TS/effect/pull/2950) [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b) Thanks @gcanti! - Ensure `Chunk.reverse` preserves `NonEmpty` status, closes #2947

- [#2954](https://github.com/Effect-TS/effect/pull/2954) [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba) Thanks @jessekelly881! - Fix runtime error in `Struct.evolve` by enhancing compile-time checks, closes #2953

- [#2948](https://github.com/Effect-TS/effect/pull/2948) [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36) Thanks @gcanti! - Remove unnecessary `===` comparison in `getEquivalence` functions

  In some `getEquivalence` functions that use `make`, there is an unnecessary `===` comparison. The `make` function already handles this comparison.

## 3.3.0

### Minor Changes

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd) Thanks @dilame! - add `Stream.zipLatestAll` api

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822) Thanks @mattrossman! - Add queuing strategy option for Stream.toReadableStream

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb) Thanks @tim-smart! - add `timeToLiveStrategy` to `Pool` options

  The `timeToLiveStrategy` determines how items are invalidated. If set to
  "creation", then items are invalidated based on their creation time. If set
  to "usage", then items are invalidated based on pool usage.

  By default, the `timeToLiveStrategy` is set to "usage".

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376) Thanks @tim-smart! - add Layer.annotateLogs & Layer.annotateSpans

  This allows you to add log & span annotation to a Layer.

  ```ts
  import { Effect, Layer } from "effect"

  Layer.effectDiscard(Effect.log("hello")).pipe(
    Layer.annotateLogs({
      service: "my-service"
    })
  )
  ```

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36) Thanks @dilame! - Types: implement `TupleOf` and `TupleOfAtLeast` types

  Predicate: implement `isTupleOf` and `isTupleOfAtLeast` type guards

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb) Thanks @tim-smart! - add `concurrency` & `targetUtilization` option to `Pool.make` & `Pool.makeWithTTL`

  This option allows you to specify the level of concurrent access per pool item.
  I.e. setting `concurrency: 2` will allow each pool item to be in use by 2 concurrent tasks.

  `targetUtilization` determines when to create new pool items. It is a value
  between 0 and 1, where 1 means only create new pool items when all the existing
  items are fully utilized.

  A `targetUtilization` of 0.5 will create new pool items when the existing items are
  50% utilized.

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22) Thanks @KhraksMamtsov! - Support `this` argument for `{STM, Either, Option}.gen`

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f) Thanks @KhraksMamtsov! - Introduced `Redacted<out T = string>` module - `Secret` generalization
  `Secret extends Redacted`
  The use of the `Redacted` has been replaced by the use of the `Redacted` in packages with version `0.*.*`

## 3.2.9

### Patch Changes

- [#2921](https://github.com/Effect-TS/effect/pull/2921) [`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461) Thanks @tim-smart! - remove usage of performance.timeOrigin

- [#2912](https://github.com/Effect-TS/effect/pull/2912) [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004) Thanks @mikearnaldi! - Remove toJSON from PrettyError and fix message generation

- [#2923](https://github.com/Effect-TS/effect/pull/2923) [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5) Thanks @tim-smart! - only wrap objects with string keys in Config.Wrap

- [#2914](https://github.com/Effect-TS/effect/pull/2914) [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa) Thanks @mikearnaldi! - Fix id extraction in Context.Tag.Identifier

## 3.2.8

### Patch Changes

- [#2894](https://github.com/Effect-TS/effect/pull/2894) [`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b) Thanks @mikearnaldi! - ensure Equal considers Date by value

## 3.2.7

### Patch Changes

- [#2887](https://github.com/Effect-TS/effect/pull/2887) [`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4) Thanks @mikearnaldi! - Ensure provide of runtime is additive on context

## 3.2.6

### Patch Changes

- [#2879](https://github.com/Effect-TS/effect/pull/2879) [`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba) Thanks @TylorS! - Support tuples in Types.DeepMutable

## 3.2.5

### Patch Changes

- [#2823](https://github.com/Effect-TS/effect/pull/2823) [`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea) Thanks @gcanti! - Array: simplify signatures (`ReadonlyArray<any> | Iterable<any> = Iterable<any>`)

- [#2834](https://github.com/Effect-TS/effect/pull/2834) [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442) Thanks @tim-smart! - attach Stream.toReadableStream fibers to scope

- [#2744](https://github.com/Effect-TS/effect/pull/2744) [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0) Thanks @KhraksMamtsov! - make `Array.separate`, `Array.getRights`, `Array.getLefts`, `Array.getSomes` heterogeneous

## 3.2.4

### Patch Changes

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3) Thanks @tim-smart! - ensure pool calls finalizer for failed acquisitions

- [#2808](https://github.com/Effect-TS/effect/pull/2808) [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d) Thanks @gcanti! - Array: fix `flatMapNullable` implementation and add descriptions / examples

## 3.2.3

### Patch Changes

- [#2805](https://github.com/Effect-TS/effect/pull/2805) [`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f) Thanks @tim-smart! - fix internal cutpoint name preservation

## 3.2.2

### Patch Changes

- [#2787](https://github.com/Effect-TS/effect/pull/2787) [`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a) Thanks @mikearnaldi! - Prohibit name clashes in Effect.Tag

  The following now correctly flags a type error given that the property `context` exists already in `Tag`:

  ```ts
  import { Effect } from "effect"

  class LoaderArgs extends Effect.Tag("@services/LoaderContext")<
    LoaderArgs,
    { context: number }
  >() {}
  ```

- [#2797](https://github.com/Effect-TS/effect/pull/2797) [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61) Thanks @mikearnaldi! - Improve internalization of functions to clean stack traces

- [#2798](https://github.com/Effect-TS/effect/pull/2798) [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2) Thanks @mikearnaldi! - Avoid eager read of the stack when captured by a span

## 3.2.1

### Patch Changes

- [#2779](https://github.com/Effect-TS/effect/pull/2779) [`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Config.Wrap for optional properties

## 3.2.0

### Minor Changes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2) Thanks [@tim-smart](https://github.com/tim-smart)! - Add Stream.toReadableStreamEffect / .toReadableStreamRuntime

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cause.prettyErrors api

  You can use this to extract `Error` instances from a `Cause`, that have clean stack traces and have had span information added to them.

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198) Thanks [@tim-smart](https://github.com/tim-smart)! - add Chunk.difference & Chunk.differenceWith

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e) Thanks [@tim-smart](https://github.com/tim-smart)! - Improve causal rendering in vitest by rethrowing pretty errors

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Effect.functionWithSpan

  Allows you to define an effectful function that is wrapped with a span.

  ```ts
  import { Effect } from "effect"

  const getTodo = Effect.functionWithSpan({
    body: (id: number) => Effect.succeed(`Got todo ${id}!`),
    options: (id) => ({
      name: `getTodo-${id}`,
      attributes: { id }
    })
  })
  ```

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7) Thanks [@tim-smart](https://github.com/tim-smart)! - Add do notation for Array

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553) Thanks [@tim-smart](https://github.com/tim-smart)! - support $is & $match for Data.TaggedEnum with generics

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - capture stack trace for tracing spans

### Patch Changes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - add span stack trace to rendered causes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e) Thanks [@tim-smart](https://github.com/tim-smart)! - Consider Generator.next a cutpoint

## 3.1.6

### Patch Changes

- [#2761](https://github.com/Effect-TS/effect/pull/2761) [`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - Add `{ once: true }` to all `"abort"` event listeners for `AbortController` to automatically remove handlers after execution

- [#2762](https://github.com/Effect-TS/effect/pull/2762) [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Config.Wrap incorrectly wrapping functions & arrays

- [#2773](https://github.com/Effect-TS/effect/pull/2773) [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for Infinity delays in Schedule

## 3.1.5

### Patch Changes

- [#2750](https://github.com/Effect-TS/effect/pull/2750) [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure exponential schedules don't reach Infinity

## 3.1.4

### Patch Changes

- [#2732](https://github.com/Effect-TS/effect/pull/2732) [`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Call Equal.equals internally in order inputs were passed.

## 3.1.3

### Patch Changes

- [#2706](https://github.com/Effect-TS/effect/pull/2706) [`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e) Thanks [@sukovanej](https://github.com/sukovanej)! - rebuild packages

## 3.1.2

### Patch Changes

- [#2679](https://github.com/Effect-TS/effect/pull/2679) [`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all type ids are annotated with `unique symbol`

## 3.1.1

### Patch Changes

- [#2670](https://github.com/Effect-TS/effect/pull/2670) [`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc) Thanks [@tim-smart](https://github.com/tim-smart)! - Allow structural regions in equality for testing

## 3.1.0

### Minor Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d) Thanks [@github-actions](https://github.com/apps/github-actions)! - add SortedMap.lastOption & partition apis

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b) Thanks [@github-actions](https://github.com/apps/github-actions)! - add `Types.DeepMutable`, an alternative to `Types.Mutable` that makes all properties recursively mutable

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Effect.annotateLogsScoped

  This api allows you to annotate logs until the Scope has been closed.

  ```ts
  import { Effect } from "effect"

  Effect.gen(function* () {
    yield* Effect.log("no annotations")
    yield* Effect.annotateLogsScoped({ foo: "bar" })
    yield* Effect.log("annotated with foo=bar")
  }).pipe(Effect.scoped, Effect.andThen(Effect.log("no annotations again")))
  ```

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83) Thanks [@github-actions](https://github.com/apps/github-actions)! - added Stream.fromEventListener, and BrowserStream.{fromEventListenerWindow, fromEventListenerDocument} for constructing a stream from addEventListener

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85) Thanks [@github-actions](https://github.com/apps/github-actions)! - add `kind` property to `Tracer.Span`

  This can be used to specify what kind of service created the span.

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Effect.timeoutOption

  Returns an effect that will return `None` if the effect times out, otherwise it
  will return `Some` of the produced value.

  ```ts
  import { Effect } from "effect"

  // will return `None` after 500 millis
  Effect.succeed("hello").pipe(
    Effect.delay(1000),
    Effect.timeoutOption("500 millis")
  )
  ```

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d) Thanks [@github-actions](https://github.com/apps/github-actions)! - add $is & $match helpers to Data.TaggedEnum constructors

  ```ts
  import { Data } from "effect"

  type HttpError = Data.TaggedEnum<{
    NotFound: {}
    InternalServerError: { reason: string }
  }>
  const { $is, $match, InternalServerError, NotFound } =
    Data.taggedEnum<HttpError>()

  // create a matcher
  const matcher = $match({
    NotFound: () => 0,
    InternalServerError: () => 1
  })

  // true
  $is("NotFound")(NotFound())

  // false
  $is("NotFound")(InternalServerError({ reason: "fail" }))
  ```

## 3.0.8

### Patch Changes

- [#2656](https://github.com/Effect-TS/effect/pull/2656) [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#2654](https://github.com/Effect-TS/effect/pull/2654) [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Actually fix Cause equality

- [#2640](https://github.com/Effect-TS/effect/pull/2640) [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461) Thanks [@patroza](https://github.com/patroza)! - fix: forEach NonEmpty overload causing inference issues for Iterables

- [#2653](https://github.com/Effect-TS/effect/pull/2653) [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Consider type of failure in Cause equality

## 3.0.7

### Patch Changes

- [#2637](https://github.com/Effect-TS/effect/pull/2637) [`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid treating completed requests as interrupted when race conditions occur

## 3.0.6

### Patch Changes

- [#2625](https://github.com/Effect-TS/effect/pull/2625) [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid circularity on generators

- [#2626](https://github.com/Effect-TS/effect/pull/2626) [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4) Thanks [@fubhy](https://github.com/fubhy)! - Reintroduce custom `NoInfer` type

- [#2609](https://github.com/Effect-TS/effect/pull/2609) [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50) Thanks [@patroza](https://github.com/patroza)! - change: BatchedRequestResolver works with NonEmptyArray

- [#2625](https://github.com/Effect-TS/effect/pull/2625) [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Make sure GenKind utilities are backward compatible

## 3.0.5

### Patch Changes

- [#2611](https://github.com/Effect-TS/effect/pull/2611) [`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify EffectGenerator type to improve inference

- [#2608](https://github.com/Effect-TS/effect/pull/2608) [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3) Thanks [@patroza](https://github.com/patroza)! - feat: foreach preserve non emptyness.

## 3.0.4

### Patch Changes

- [#2602](https://github.com/Effect-TS/effect/pull/2602) [`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - allow use of generators (Effect.gen) without the adapter

  Effect's data types now implement a Iterable that can be `yield*`'ed directly.

  ```ts
  Effect.gen(function* () {
    const a = yield* Effect.success(1)
    const b = yield* Effect.success(2)
    return a + b
  })
  ```

## 3.0.3

### Patch Changes

- [#2568](https://github.com/Effect-TS/effect/pull/2568) [`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Match.withReturnType api

  Which can be used to constrain the return type of a match expression.

  ```ts
  import { Match } from "effect"

  Match.type<string>().pipe(
    Match.withReturnType<string>(),
    Match.when("foo", () => "foo"), // valid
    Match.when("bar", () => 123), // type error
    Match.else(() => "baz")
  )
  ```

## 3.0.2

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

## 3.0.1

### Patch Changes

- [#2539](https://github.com/Effect-TS/effect/pull/2539) [`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8) Thanks [@tim-smart](https://github.com/tim-smart)! - skip running effects in FiberHandle/Map if not required

- [#2552](https://github.com/Effect-TS/effect/pull/2552) [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716) Thanks [@TylorS](https://github.com/TylorS)! - Improve typings of Array.isArray

- [#2555](https://github.com/Effect-TS/effect/pull/2555) [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent use of `Array` as import name to solve bundler issues

## 3.0.0

### Major Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Minor Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3) Thanks [@github-actions](https://github.com/apps/github-actions)! - close FiberHandle/FiberSet/FiberMap when it is released

  When they are closed, fibers can no longer be added to them.

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548) Thanks [@github-actions](https://github.com/apps/github-actions)! - add preregisteredWords option to frequency metric key type

  You can use this to register a list of words to pre-populate the value of the
  metric.

  ```ts
  import { Metric } from "effect"

  const counts = Metric.frequency("counts", {
    preregisteredWords: ["a", "b", "c"]
  }).register()
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Bump TypeScript min requirement to version 5.4

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba) Thanks [@github-actions](https://github.com/apps/github-actions)! - add unique identifier to Tracer.ParentSpan tag

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092) Thanks [@github-actions](https://github.com/apps/github-actions)! - The signatures of the `HaltStrategy.match` `StreamHaltStrategy.match` functions have been changed to the generally accepted ones

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb) Thanks [@github-actions](https://github.com/apps/github-actions)! - support variadic arguments in Effect.log

  This makes Effect.log more similar to console.log:

  ```ts
  Effect.log("hello", { foo: "bar" }, Cause.fail("error"))
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix ConfigError `_tag`, with the previous implementation catching the `ConfigError` with `Effect.catchTag` would show `And`, `Or`, etc.

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1) Thanks [@github-actions](https://github.com/apps/github-actions)! - replace use of `unit` terminology with `void`

  For all the data types.

  ```ts
  Effect.unit // => Effect.void
  Stream.unit // => Stream.void

  // etc
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Either: fix `getEquivalence` parameter order from `Either.getEquivalence(left, right)` to `Either.getEquivalence({ left, right })`

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650) Thanks [@github-actions](https://github.com/apps/github-actions)! - use LazyArg for Effect.if branches

  Instead of:

  ```ts
  Effect.if(true, {
    onTrue: Effect.succeed("true"),
    onFalse: Effect.succeed("false")
  })
  ```

  You should now write:

  ```ts
  Effect.if(true, {
    onTrue: () => Effect.succeed("true"),
    onFalse: () => Effect.succeed("false")
  })
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Replaced custom `NoInfer` type with the native `NoInfer` type from TypeScript 5.4

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - `Cache<Key, Error, Value>` has been changed to `Cache<Key, Value, Error = never>`.
  `ScopedCache<Key, Error, Value>` has been changed to `ScopedCache<Key, Value, Error = never>`.
  `Lookup<Key, Environment, Error, Value>` has been changed to `Lookup<Key, Value, Error = never, Environment = never>`

### Patch Changes

- [#2104](https://github.com/Effect-TS/effect/pull/2104) [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8) Thanks [@IMax153](https://github.com/IMax153)! - don't run resolver if there are no incomplete requests

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3) Thanks [@github-actions](https://github.com/apps/github-actions)! - add FiberMap.has/unsafeHas api

- [#2104](https://github.com/Effect-TS/effect/pull/2104) [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8) Thanks [@IMax153](https://github.com/IMax153)! - add String casing transformation apis

  - `snakeToCamel`
  - `snakeToPascal`
  - `snakeToKebab`
  - `camelToSnake`
  - `pascalToSnake`
  - `kebabToSnake`

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3) Thanks [@github-actions](https://github.com/apps/github-actions)! - add FiberHandle module, for holding a reference to a running fiber

  ```ts
  import { Effect, FiberHandle } from "effect"

  Effect.gen(function* (_) {
    const handle = yield* _(FiberHandle.make())

    // run some effects
    yield* _(FiberHandle.run(handle, Effect.never))
    // this will interrupt the previous fiber
    yield* _(FiberHandle.run(handle, Effect.never))
    // this will not run, as a fiber is already running
    yield* _(FiberHandle.run(handle, Effect.never, { onlyIfMissing: true }))

    yield* _(Effect.sleep(1000))
  }).pipe(
    Effect.scoped // The fiber will be interrupted when the scope is closed
  )
  ```

- [#2521](https://github.com/Effect-TS/effect/pull/2521) [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8) Thanks [@patroza](https://github.com/patroza)! - change return type of Fiber.joinAll to return an array

## 2.4.19

### Patch Changes

- [#2503](https://github.com/Effect-TS/effect/pull/2503) [`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871) Thanks [@gcanti](https://github.com/gcanti)! - Centralize error messages for bugs

- [#2493](https://github.com/Effect-TS/effect/pull/2493) [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b) Thanks [@gcanti](https://github.com/gcanti)! - add a `RegExp` module to `packages/effect`, closes #2488

- [#2499](https://github.com/Effect-TS/effect/pull/2499) [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure FIFO ordering when a Deferred is resolved

- [#2502](https://github.com/Effect-TS/effect/pull/2502) [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9) Thanks [@tim-smart](https://github.com/tim-smart)! - make tracing spans cheaper to construct

- [#2472](https://github.com/Effect-TS/effect/pull/2472) [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55) Thanks [@tim-smart](https://github.com/tim-smart)! - add Subscribable trait / module

  Subscribable represents a resource that has a current value and can be subscribed to for updates.

  The following data types are subscribable:

  - A `SubscriptionRef`
  - An `Actor` from the experimental `Machine` module

- [#2500](https://github.com/Effect-TS/effect/pull/2500) [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify scope internals

- [#2507](https://github.com/Effect-TS/effect/pull/2507) [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8) Thanks [@gcanti](https://github.com/gcanti)! - ensure correct value is passed to mapping function in `mapAccum` loop, closes #2506

- [#2472](https://github.com/Effect-TS/effect/pull/2472) [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55) Thanks [@tim-smart](https://github.com/tim-smart)! - add Readable module / trait

  `Readable` is a common interface for objects that can be read from using a `get`
  Effect.

  For example, `Ref`'s implement `Readable`:

  ```ts
  import { Effect, Readable, Ref } from "effect"
  import assert from "assert"

  Effect.gen(function* (_) {
    const ref = yield* _(Ref.make(123))
    assert(Readable.isReadable(ref))

    const result = yield* _(ref.get)
    assert(result === 123)
  })
  ```

- [#2498](https://github.com/Effect-TS/effect/pull/2498) [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added {Readable, Subscribable}.unwrap

- [#2494](https://github.com/Effect-TS/effect/pull/2494) [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Add `Duration.divide` and `Duration.unsafeDivide`.

  ```ts
  import { Duration, Option } from "effect"
  import assert from "assert"

  assert.deepStrictEqual(
    Duration.divide("10 seconds", 2),
    Option.some(Duration.decode("5 seconds"))
  )
  assert.deepStrictEqual(Duration.divide("10 seconds", 0), Option.none())
  assert.deepStrictEqual(Duration.divide("1 nano", 1.5), Option.none())

  assert.deepStrictEqual(
    Duration.unsafeDivide("10 seconds", 2),
    Duration.decode("5 seconds")
  )
  assert.deepStrictEqual(
    Duration.unsafeDivide("10 seconds", 0),
    Duration.infinity
  )
  assert.throws(() => Duration.unsafeDivide("1 nano", 1.5))
  ```

## 2.4.18

### Patch Changes

- [#2473](https://github.com/Effect-TS/effect/pull/2473) [`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.withConsoleLog/withConsoleError apis

  These apis send a Logger's output to console.log/console.error respectively.

  ```ts
  import { Logger } from "effect"

  // send output to stderr
  const stderrLogger = Logger.withConsoleError(Logger.stringLogger)
  ```

## 2.4.17

### Patch Changes

- [#2461](https://github.com/Effect-TS/effect/pull/2461) [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613) Thanks [@tim-smart](https://github.com/tim-smart)! - add Inspectable.toStringUnknown/stringifyCircular

- [#2462](https://github.com/Effect-TS/effect/pull/2462) [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7) Thanks [@tim-smart](https://github.com/tim-smart)! - remove handled errors from Effect.retryOrElse

- [#2461](https://github.com/Effect-TS/effect/pull/2461) [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613) Thanks [@tim-smart](https://github.com/tim-smart)! - improve formatting of Runtime failures

- [#2415](https://github.com/Effect-TS/effect/pull/2415) [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6) Thanks [@tim-smart](https://github.com/tim-smart)! - add Iterable module

  This module shares many apis compared to "effect/ReadonlyArray", but is fully lazy.

  ```ts
  import { Iterable, pipe } from "effect"

  // Only 5 items will be generated & transformed
  pipe(
    Iterable.range(1, 100),
    Iterable.map((i) => `item ${i}`),
    Iterable.take(5)
  )
  ```

- [#2438](https://github.com/Effect-TS/effect/pull/2438) [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support Heterogeneous Effects in Effect Iterable apis

  Including:

  - `Effect.allSuccesses`
  - `Effect.firstSuccessOf`
  - `Effect.mergeAll`
  - `Effect.reduceEffect`
  - `Effect.raceAll`
  - `Effect.forkAll`

  For example:

  ```ts
  import { Effect } from "effect"

  class Foo extends Effect.Tag("Foo")<Foo, 3>() {}
  class Bar extends Effect.Tag("Bar")<Bar, 4>() {}

  // const program: Effect.Effect<(1 | 2 | 3 | 4)[], never, Foo | Bar>
  export const program = Effect.allSuccesses([
    Effect.succeed(1 as const),
    Effect.succeed(2 as const),
    Foo,
    Bar
  ])
  ```

  The above is now possible while before it was expecting all Effects to conform to the same type

- [#2438](https://github.com/Effect-TS/effect/pull/2438) [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add Effect.filterMap api

  Which allows you to filter and map an Iterable of Effects in one step.

  ```ts
  import { Effect, Option } from "effect"

  // resolves with `["even: 2"]
  Effect.filterMap(
    [Effect.succeed(1), Effect.succeed(2), Effect.succeed(3)],
    (i) => (i % 2 === 0 ? Option.some(`even: ${i}`) : Option.none())
  )
  ```

- [#2461](https://github.com/Effect-TS/effect/pull/2461) [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613) Thanks [@tim-smart](https://github.com/tim-smart)! - use Inspectable.toStringUnknown for absurd runtime errors

- [#2460](https://github.com/Effect-TS/effect/pull/2460) [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f) Thanks [@tim-smart](https://github.com/tim-smart)! - use const type parameter for Config.withDefault

  Which ensures that the fallback value type is not widened for literals.

## 2.4.16

### Patch Changes

- [#2445](https://github.com/Effect-TS/effect/pull/2445) [`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2) Thanks [@vecerek](https://github.com/vecerek)! - generate proper trace ids in default effect Tracer

## 2.4.15

### Patch Changes

- [#2407](https://github.com/Effect-TS/effect/pull/2407) [`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Add Config.duration

  This can be used to parse Duration's from environment variables:

  ```ts
  import { Config, Effect } from "effect"

  Config.duration("CACHE_TTL").pipe(
    Effect.andThen((duration) => ...)
  )
  ```

- [#2416](https://github.com/Effect-TS/effect/pull/2416) [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Collect exits on forEach interrupt of residual requests

## 2.4.14

### Patch Changes

- [#2404](https://github.com/Effect-TS/effect/pull/2404) [`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa) Thanks [@patroza](https://github.com/patroza)! - fix interruption of parked Requests

## 2.4.13

### Patch Changes

- [#2402](https://github.com/Effect-TS/effect/pull/2402) [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499) Thanks [@tim-smart](https://github.com/tim-smart)! - add Duration.subtract api

- [#2399](https://github.com/Effect-TS/effect/pull/2399) [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd) Thanks [@coleea](https://github.com/coleea)! - add BigInt.fromString and BigInt.fromNumber

- [#2402](https://github.com/Effect-TS/effect/pull/2402) [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499) Thanks [@tim-smart](https://github.com/tim-smart)! - remove use of bigint literals in Duration

## 2.4.12

### Patch Changes

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - update typescript to 5.4

## 2.4.11

### Patch Changes

- [#2384](https://github.com/Effect-TS/effect/pull/2384) [`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#2381](https://github.com/Effect-TS/effect/pull/2381) [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5) Thanks [@tim-smart](https://github.com/tim-smart)! - add fiber ref for disabling the tracer

  You can use it with the Effect.withTracerEnabled api:

  ```ts
  import { Effect } from "effect"

  Effect.succeed(42).pipe(
    Effect.withSpan("my-span"),
    // the span will not be registered with the tracer
    Effect.withTracerEnabled(false)
  )
  ```

- [#2383](https://github.com/Effect-TS/effect/pull/2383) [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60) Thanks [@tim-smart](https://github.com/tim-smart)! - add Duration.isFinite api, to determine if a duration is not Infinity

## 2.4.10

### Patch Changes

- [#2375](https://github.com/Effect-TS/effect/pull/2375) [`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a) Thanks [@tim-smart](https://github.com/tim-smart)! - remove dangling variable in frequency metric hook

- [#2373](https://github.com/Effect-TS/effect/pull/2373) [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968) Thanks [@patroza](https://github.com/patroza)! - Use incremental counters instead of up-down for runtime metrics

## 2.4.9

### Patch Changes

- [#2357](https://github.com/Effect-TS/effect/pull/2357) [`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99) Thanks [@tim-smart](https://github.com/tim-smart)! - make more data types in /platform implement Inspectable

## 2.4.8

### Patch Changes

- [#2354](https://github.com/Effect-TS/effect/pull/2354) [`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566) Thanks [@tim-smart](https://github.com/tim-smart)! - add overload to Effect.filterOrFail that fails with NoSuchElementException

  This allows you to perform a filterOrFail without providing a fallback failure
  function.

  Example:

  ```ts
  import { Effect } from "effect"

  // fails with NoSuchElementException
  Effect.succeed(1).pipe(Effect.filterOrFail((n) => n === 0))
  ```

- [#2336](https://github.com/Effect-TS/effect/pull/2336) [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Predicate.isTruthy

- [#2351](https://github.com/Effect-TS/effect/pull/2351) [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0) Thanks [@tim-smart](https://github.com/tim-smart)! - fix metrics not using labels from fiber ref

- [#2266](https://github.com/Effect-TS/effect/pull/2266) [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742) Thanks [@patroza](https://github.com/patroza)! - fix Effect.Tag generated proxy functions to work with andThen/tap, or others that do function/isEffect checks

- [#2353](https://github.com/Effect-TS/effect/pull/2353) [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16) Thanks [@tim-smart](https://github.com/tim-smart)! - Types: add `Has` helper

- [#2299](https://github.com/Effect-TS/effect/pull/2299) [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9) Thanks [@alex-dixon](https://github.com/alex-dixon)! - Prevent Effect.if from crashing when first argument is not an Effect

## 2.4.7

### Patch Changes

- [#2328](https://github.com/Effect-TS/effect/pull/2328) [`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6) Thanks [@tim-smart](https://github.com/tim-smart)! - set unhandled log level to none for fibers in FiberSet/Map

## 2.4.6

### Patch Changes

- [#2290](https://github.com/Effect-TS/effect/pull/2290) [`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove function renaming from internals, introduce new cutpoint strategy

- [#2311](https://github.com/Effect-TS/effect/pull/2311) [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f) Thanks [@tim-smart](https://github.com/tim-smart)! - add Channel.splitLines api

  It splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
  newlines (`\n`).

## 2.4.5

### Patch Changes

- [#2300](https://github.com/Effect-TS/effect/pull/2300) [`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix `intersperse` signature

- [#2303](https://github.com/Effect-TS/effect/pull/2303) [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix `sort` signature, closes #2301

## 2.4.4

### Patch Changes

- [#2172](https://github.com/Effect-TS/effect/pull/2172) [`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949) Thanks [@gcanti](https://github.com/gcanti)! - Brand: add `refined` overload

  ```ts
  export function refined<A extends Brand<any>>(
    f: (unbranded: Brand.Unbranded<A>) => Option.Option<Brand.BrandErrors>
  ): Brand.Constructor<A>
  ```

- [#2285](https://github.com/Effect-TS/effect/pull/2285) [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for AbortSignal's to runPromise

  If the signal is aborted, the effect execution will be interrupted.

  ```ts
  import { Effect } from "effect"

  const controller = new AbortController()

  Effect.runPromise(Effect.never, { signal: controller.signal })

  // abort after 1 second
  setTimeout(() => controller.abort(), 1000)
  ```

- [#2293](https://github.com/Effect-TS/effect/pull/2293) [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2) Thanks [@tim-smart](https://github.com/tim-smart)! - add AbortSignal support to ManagedRuntime

- [#2288](https://github.com/Effect-TS/effect/pull/2288) [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize addition of blocked requests to parallel collection

- [#2288](https://github.com/Effect-TS/effect/pull/2288) [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4) Thanks [@tim-smart](https://github.com/tim-smart)! - use Chunk for request block collections

- [#2280](https://github.com/Effect-TS/effect/pull/2280) [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added support for PromiseLike

## 2.4.3

### Patch Changes

- [#2211](https://github.com/Effect-TS/effect/pull/2211) [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e) Thanks [@tim-smart](https://github.com/tim-smart)! - add ManagedRuntime module, to make incremental adoption easier

  You can use a ManagedRuntime to run Effect's that can use the
  dependencies from the given Layer. For example:

  ```ts
  import { Console, Effect, Layer, ManagedRuntime } from "effect"

  class Notifications extends Effect.Tag("Notifications")<
    Notifications,
    { readonly notify: (message: string) => Effect.Effect<void> }
  >() {
    static Live = Layer.succeed(this, {
      notify: (message) => Console.log(message)
    })
  }

  async function main() {
    const runtime = ManagedRuntime.make(Notifications.Live)
    await runtime.runPromise(Notifications.notify("Hello, world!"))
    await runtime.dispose()
  }

  main()
  ```

- [#2211](https://github.com/Effect-TS/effect/pull/2211) [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.toRuntimeWithMemoMap api

  Similar to Layer.toRuntime, but allows you to share a Layer.MemoMap between
  layer builds.

  By sharing the MemoMap, layers are shared between each build - ensuring layers
  are only built once between multiple calls to Layer.toRuntimeWithMemoMap.

## 2.4.2

### Patch Changes

- [#2264](https://github.com/Effect-TS/effect/pull/2264) [`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0) Thanks [@patroza](https://github.com/patroza)! - fix: unmatched function fallthrough in `andThen` and `tap`

- [#2225](https://github.com/Effect-TS/effect/pull/2225) [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Effect.Tag to simplify access to service.

  This change allows to define tags in the following way:

  ```ts
  class DemoTag extends Effect.Tag("DemoTag")<
    DemoTag,
    {
      readonly getNumbers: () => Array<number>
      readonly strings: Array<string>
    }
  >() {}
  ```

  And use them like:

  ```ts
  DemoTag.getNumbers()
  DemoTag.strings
  ```

  This fuses together `serviceFunctions` and `serviceConstants` in the static side of the tag.

  Additionally it allows using the service like:

  ```ts
  DemoTag.use((_) => _.getNumbers())
  ```

  This is especially useful when having functions that contain generics in the service given that those can't be reliably transformed at the type level and because of that we can't put them on the tag.

- [#2238](https://github.com/Effect-TS/effect/pull/2238) [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750) Thanks [@JJayet](https://github.com/JJayet)! - Request: swap Success and Error params

- [#2270](https://github.com/Effect-TS/effect/pull/2270) [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed) Thanks [@tim-smart](https://github.com/tim-smart)! - add structured logging apis

  - Logger.json / Logger.jsonLogger
  - Logger.structured / Logger.structuredLogger

  `Logger.json` logs JSON serialized strings to the console.

  `Logger.structured` logs structured objects, which is useful in the browser
  where you can inspect objects logged to the console.

- [#2257](https://github.com/Effect-TS/effect/pull/2257) [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Make sure Effect.Tag works on primitives.

  This change allows the following to work just fine:

  ```ts
  import { Effect, Layer } from "effect"

  class DateTag extends Effect.Tag("DateTag")<DateTag, Date>() {
    static date = new Date(1970, 1, 1)
    static Live = Layer.succeed(this, this.date)
  }

  class MapTag extends Effect.Tag("MapTag")<MapTag, Map<string, string>>() {
    static Live = Layer.effect(
      this,
      Effect.sync(() => new Map())
    )
  }

  class NumberTag extends Effect.Tag("NumberTag")<NumberTag, number>() {
    static Live = Layer.succeed(this, 100)
  }
  ```

- [#2244](https://github.com/Effect-TS/effect/pull/2244) [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberMap/FiberSet.join api

  This api can be used to propogate failures back to a parent fiber, in case any of the fibers added to the FiberMap/FiberSet fail with an error.

  Example:

  ```ts
  import { Effect, FiberSet } from "effect"

  Effect.gen(function* (_) {
    const set = yield* _(FiberSet.make())
    yield* _(FiberSet.add(set, Effect.runFork(Effect.fail("error"))))

    // parent fiber will fail with "error"
    yield* _(FiberSet.join(set))
  })
  ```

- [#2238](https://github.com/Effect-TS/effect/pull/2238) [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750) Thanks [@JJayet](https://github.com/JJayet)! - make Effect.request dual

- [#2263](https://github.com/Effect-TS/effect/pull/2263) [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Allow duration inputs to be singular

- [#2255](https://github.com/Effect-TS/effect/pull/2255) [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Either.Either.{Left,Right} and Option.Option.Value type utils

- [#2270](https://github.com/Effect-TS/effect/pull/2270) [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.batched, for batching logger output

  It takes a duration window and an effectful function that processes the batched output.

  Example:

  ```ts
  import { Console, Effect, Logger } from "effect"

  const LoggerLive = Logger.replaceScoped(
    Logger.defaultLogger,
    Logger.logfmtLogger.pipe(
      Logger.batched("500 millis", (messages) =>
        Console.log("BATCH", messages.join("\n"))
      )
    )
  )

  Effect.gen(function* (_) {
    yield* _(Effect.log("one"))
    yield* _(Effect.log("two"))
    yield* _(Effect.log("three"))
  }).pipe(Effect.provide(LoggerLive), Effect.runFork)
  ```

- [#2233](https://github.com/Effect-TS/effect/pull/2233) [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27) Thanks [@gcanti](https://github.com/gcanti)! - Struct: make `pick` / `omit` dual

## 2.4.1

### Patch Changes

- [#2219](https://github.com/Effect-TS/effect/pull/2219) [`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - fix documentation for `Predicate.isNull` `Predicate.isNotNull`

- [#2223](https://github.com/Effect-TS/effect/pull/2223) [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831) Thanks [@Schniz](https://github.com/Schniz)! - document Effect.zipLeft and Effect.zipRight

- [#2224](https://github.com/Effect-TS/effect/pull/2224) [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added isSet and isMap to Predicate module

## 2.4.0

### Minor Changes

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2) Thanks [@github-actions](https://github.com/apps/github-actions)! - remove ReadonlyRecord.fromIterable (duplicate of fromEntries)

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101) Thanks [@github-actions](https://github.com/apps/github-actions)! - - swap `Schedule` type parameters from `Schedule<out Env, in In, out Out>` to `Schedule<out Out, in In = unknown, out R = never>`, closes #2154

  - swap `ScheduleDriver` type parameters from `ScheduleDriver<out Env, in In, out Out>` to `ScheduleDriver<out Out, in In = unknown, out R = never>`

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f) Thanks [@github-actions](https://github.com/apps/github-actions)! - Consolidate `Effect.asyncOption`, `Effect.asyncEither`, `Stream.asyncOption`, `Stream.asyncEither`, and `Stream.asyncInterrupt`

  This PR removes `Effect.asyncOption` and `Effect.asyncEither` as their behavior can be entirely implemented with the new signature of `Effect.async`, which optionally returns a cleanup `Effect` from the registration callback.

  ```ts
  declare const async: <A, E = never, R = never>(
    register: (
      callback: (_: Effect<A, E, R>) => void,
      signal: AbortSignal
    ) => void | Effect<void, never, R>,
    blockingOn?: FiberId
  ) => Effect<A, E, R>
  ```

  Additionally, this PR removes `Stream.asyncOption`, `Stream.asyncEither`, and `Stream.asyncInterrupt` as their behavior can be entirely implemented with the new signature of `Stream.async`, which can optionally return a cleanup `Effect` from the registration callback.

  ```ts
  declare const async: <A, E = never, R = never>(
    register: (emit: Emit<R, E, A, void>) => Effect<void, never, R> | void,
    outputBuffer?: number
  ) => Stream<A, E, R>
  ```

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f) Thanks [@github-actions](https://github.com/apps/github-actions)! - swap `GroupBy` type parameters from `GroupBy<out R, out E, out K, out V>` to `GroupBy<out K, out V, out E = never, out R = never>`

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484) Thanks [@github-actions](https://github.com/apps/github-actions)! - Remove Effect.unified and Effect.unifiedFn in favour of Unify.unify.

  The `Unify` module fully replaces the need for specific unify functions, when before you did:

  ```ts
  import { Effect } from "effect"

  const effect = Effect.unified(
    Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
  )
  const effectFn = Effect.unifiedFn((n: number) =>
    Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
  )
  ```

  You can now do:

  ```ts
  import { Effect, Unify } from "effect"

  const effect = Unify.unify(
    Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
  )
  const effectFn = Unify.unify((n: number) =>
    Math.random() > 0.5 ? Effect.succeed("OK") : Effect.fail("NO")
  )
  ```

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2) Thanks [@github-actions](https://github.com/apps/github-actions)! - add key type to ReadonlyRecord

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe) Thanks [@github-actions](https://github.com/apps/github-actions)! - add support for optional property keys to `pick`, `omit` and `get`

  Before:

  ```ts
  import { pipe } from "effect/Function"
  import * as S from "effect/Struct"

  const struct: {
    a?: string
    b: number
    c: boolean
  } = { b: 1, c: true }

  // error
  const x = pipe(struct, S.pick("a", "b"))

  const record: Record<string, number> = {}

  const y = pipe(record, S.pick("a", "b"))
  console.log(y) // => { a: undefined, b: undefined }

  // error
  console.log(pipe(struct, S.get("a")))
  ```

  Now

  ```ts
  import { pipe } from "effect/Function"
  import * as S from "effect/Struct"

  const struct: {
    a?: string
    b: number
    c: boolean
  } = { b: 1, c: true }

  const x = pipe(struct, S.pick("a", "b"))
  console.log(x) // => { b: 1 }

  const record: Record<string, number> = {}

  const y = pipe(record, S.pick("a", "b"))
  console.log(y) // => {}

  console.log(pipe(struct, S.get("a"))) // => undefined
  ```

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type params of Either from `Either<E, A>` to `Either<R, L = never>`.

  Along the same line of the other changes this allows to shorten the most common types such as:

  ```ts
  import { Either } from "effect"

  const right: Either.Either<string> = Either.right("ok")
  ```

### Patch Changes

- [#2193](https://github.com/Effect-TS/effect/pull/2193) [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Number.parse, BigInt.toNumber, ParseResult.fromOption

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a) Thanks [@github-actions](https://github.com/apps/github-actions)! - ReadonlyArray.groupBy: allow for grouping by symbols, closes #2180

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e) Thanks [@github-actions](https://github.com/apps/github-actions)! - Either: fix `fromOption` overloads order

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add Do notation methods `Do`, `bindTo`, `bind` and `let` to Either

## 2.3.8

### Patch Changes

- [#2167](https://github.com/Effect-TS/effect/pull/2167) [`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9) Thanks [@tim-smart](https://github.com/tim-smart)! - add Hash.cached

  This api assists with adding a layer of caching, when hashing immutable data structures.

  ```ts
  import { Data, Hash } from "effect"

  class User extends Data.Class<{
    id: number
    name: string
  }> {
    [Hash.symbol]() {
      return Hash.cached(this, Hash.string(`${this.id}-${this.name}`))
    }
  }
  ```

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

## 2.3.7

### Patch Changes

- [#2142](https://github.com/Effect-TS/effect/pull/2142) [`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose version control via ModuleVersion.

  This enables low level framework authors to run their own effect version which won't conflict with any other effect versions running on the same process.

  Imagine cases where for example a function runtime is built on effect, we don't want lifecycle of the runtime to clash with lifecycle of user-land provided code.

  To manually control the module version one can use:

  ```ts
  import * as ModuleVersion from "effect/ModuleVersion"

  ModuleVersion.setCurrentVersion(
    `my-effect-runtime-${ModuleVersion.getCurrentVersion()}`
  )
  ```

  Note that this code performs side effects and should be executed before any module is imported ideally via an init script.

  The resulting order of execution has to be:

  ```ts
  import * as ModuleVersion from "effect/ModuleVersion"

  ModuleVersion.setCurrentVersion(
    `my-effect-runtime-${ModuleVersion.getCurrentVersion()}`
  )

  import { Effect } from "effect"

  // rest of code
  ```

- [#2159](https://github.com/Effect-TS/effect/pull/2159) [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de) Thanks [@IMax153](https://github.com/IMax153)! - Avoid incrementing cache hits for expired entries

- [#2165](https://github.com/Effect-TS/effect/pull/2165) [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Hash implemention for Option.none

## 2.3.6

### Patch Changes

- [#2145](https://github.com/Effect-TS/effect/pull/2145) [`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444) Thanks [@tim-smart](https://github.com/tim-smart)! - add RequestResolver.aroundRequests api

  This can be used to run side effects that introspect the requests being
  executed.

  Example:

  ```ts
  import { Effect, Request, RequestResolver } from "effect"

  interface GetUserById extends Request.Request<unknown> {
    readonly id: number
  }

  declare const resolver: RequestResolver.RequestResolver<GetUserById>

  RequestResolver.aroundRequests(
    resolver,
    (requests) => Effect.log(`got ${requests.length} requests`),
    (requests, _) => Effect.log(`finised running ${requests.length} requests`)
  )
  ```

- [#2148](https://github.com/Effect-TS/effect/pull/2148) [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8) Thanks [@riordanpawley](https://github.com/riordanpawley)! - Flipped scheduleForked types to match new <A, E, R> signature

- [#2139](https://github.com/Effect-TS/effect/pull/2139) [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce FiberId.Single, make FiberId.None behave like FiberId.Runtime, relax FiberRefs to use Single instead of Runtime.

  This change is a precursor to enable easier APIs to modify the Runtime when patching FiberRefs.

- [#2137](https://github.com/Effect-TS/effect/pull/2137) [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Expose Random Tag and functions to use a specific random service implementation

- [#2143](https://github.com/Effect-TS/effect/pull/2143) [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Cause.pretty when toString is invalid

  ```ts
  import { Cause } from "effect"

  console.log(Cause.pretty(Cause.fail([{ toString: "" }])))
  ```

  The code above used to throw now it prints:

  ```bash
  Error: [{"toString":""}]
  ```

- [#2080](https://github.com/Effect-TS/effect/pull/2080) [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - Add functional analogue of `satisfies` operator.
  This is a convenient operator to use in the `pipe` chain to localize type errors closer to their source.

  ```ts
  import { satisfies } from "effect/Function"

  const test1 = satisfies<number>()(5 as const)
  // ^? const test: 5

  // @ts-expect-error
  const test2 = satisfies<string>()(5)
  // ^? Argument of type 'number' is not assignable to parameter of type 'string'
  ```

- [#2147](https://github.com/Effect-TS/effect/pull/2147) [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62) Thanks [@tim-smart](https://github.com/tim-smart)! - generate a random span id for the built-in tracer

  This ensures the same span id isn't used between application runs.

- [#2144](https://github.com/Effect-TS/effect/pull/2144) [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix withRandom and withClock types

- [#2138](https://github.com/Effect-TS/effect/pull/2138) [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix internals of TestAnnotationsMap making it respect equality

- [#2149](https://github.com/Effect-TS/effect/pull/2149) [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce) Thanks [@tim-smart](https://github.com/tim-smart)! - add Runtime.updateFiberRefs/setFiberRef/deleteFiberRef

  This change allows you to update fiber ref values inside a Runtime object.

  Example:

  ```ts
  import { Effect, FiberRef, Runtime } from "effect"

  const ref = FiberRef.unsafeMake(0)

  const updatedRuntime = Runtime.defaultRuntime.pipe(
    Runtime.setFiberRef(ref, 1)
  )

  // returns 1
  const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref))
  ```

## 2.3.5

### Patch Changes

- [#2114](https://github.com/Effect-TS/effect/pull/2114) [`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3) Thanks [@IMax153](https://github.com/IMax153)! - Fix the ordering of results returned from batched requests

## 2.3.4

### Patch Changes

- [#2107](https://github.com/Effect-TS/effect/pull/2107) [`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure large semaphore takes don't block smaller takes

## 2.3.3

### Patch Changes

- [#2090](https://github.com/Effect-TS/effect/pull/2090) [`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6) Thanks [@hsubra89](https://github.com/hsubra89)! - Update `RateLimiter` to support passing in a custom `cost` per effect. This is really useful for API(s) that have a "credit cost" per endpoint.

  Usage Example :

  ```ts
  import { Effect, RateLimiter } from "effect"
  import { compose } from "effect/Function"

  const program = Effect.scoped(
    Effect.gen(function* ($) {
      // Create a rate limiter that has an hourly limit of 1000 credits
      const rateLimiter = yield* $(RateLimiter.make(1000, "1 hours"))
      // Query API costs 1 credit per call ( 1 is the default cost )
      const queryAPIRL = compose(rateLimiter, RateLimiter.withCost(1))
      // Mutation API costs 5 credits per call
      const mutationAPIRL = compose(rateLimiter, RateLimiter.withCost(5))
      // ...
      // Use the pre-defined rate limiters
      yield* $(queryAPIRL(Effect.log("Sample Query")))
      yield* $(mutationAPIRL(Effect.log("Sample Mutation")))

      // Or set a cost on-the-fly
      yield* $(
        rateLimiter(Effect.log("Another query with a different cost")).pipe(
          RateLimiter.withCost(3)
        )
      )
    })
  )
  ```

- [#2097](https://github.com/Effect-TS/effect/pull/2097) [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f) Thanks [@IMax153](https://github.com/IMax153)! - Updates the `RateLimiter.make` constructor to take an object of `RateLimiter.Options`, which allows for specifying the rate-limiting algorithm to utilize:

  You can choose from either the `token-bucket` or the `fixed-window` algorithms for rate-limiting.

  ```ts
  export declare namespace RateLimiter {
    export interface Options {
      /**
       * The maximum number of requests that should be allowed.
       */
      readonly limit: number
      /**
       * The interval to utilize for rate-limiting requests. The semantics of the
       * specified `interval` vary depending on the chosen `algorithm`:
       *
       * `token-bucket`: The maximum number of requests will be spread out over
       * the provided interval if no tokens are available.
       *
       * For example, for a `RateLimiter` using the `token-bucket` algorithm with
       * a `limit` of `10` and an `interval` of `1 seconds`, `1` request can be
       * made every `100 millis`.
       *
       * `fixed-window`: The maximum number of requests will be reset during each
       * interval. For example, for a `RateLimiter` using the `fixed-window`
       * algorithm with a `limit` of `10` and an `interval` of `1 seconds`, a
       * maximum of `10` requests can be made each second.
       */
      readonly interval: DurationInput
      /**
       * The algorithm to utilize for rate-limiting requests.
       *
       * Defaults to `token-bucket`.
       */
      readonly algorithm?: "fixed-window" | "token-bucket"
    }
  }
  ```

- [#2097](https://github.com/Effect-TS/effect/pull/2097) [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f) Thanks [@IMax153](https://github.com/IMax153)! - return the resulting available permits from Semaphore.release

## 2.3.2

### Patch Changes

- [#2096](https://github.com/Effect-TS/effect/pull/2096) [`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328) Thanks [@tim-smart](https://github.com/tim-smart)! - default to `never` for Runtime returning functions

  This includes:

  - Effect.runtime
  - FiberSet.makeRuntime

  It prevents `unknown` from creeping into types, as well as `never` being a
  useful default type for propogating Fiber Refs and other context.

- [#2094](https://github.com/Effect-TS/effect/pull/2094) [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180) Thanks [@tim-smart](https://github.com/tim-smart)! - revert some type param adjustments in FiberSet

  `makeRuntime` now has the R parameter first again.

  Default to `unknown` for the A and E parameters instead of never.

- [#2103](https://github.com/Effect-TS/effect/pull/2103) [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6) Thanks [@patroza](https://github.com/patroza)! - Expand Either and Option `andThen` to support the `map` case like Effects' `andThen`

  For example:

  ```ts
  expect(pipe(Either.right(1), Either.andThen(2))).toStrictEqual(
    Either.right(2)
  )
  expect(
    pipe(
      Either.right(1),
      Either.andThen(() => 2)
    )
  ).toStrictEqual(Either.right(2))

  expect(pipe(Option.some(1), Option.andThen(2))).toStrictEqual(Option.some(2))
  expect(
    pipe(
      Option.some(1),
      Option.andThen(() => 2)
    )
  ).toStrictEqual(Option.some(2))
  ```

- [#2098](https://github.com/Effect-TS/effect/pull/2098) [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447) Thanks [@ethanniser](https://github.com/ethanniser)! - removed `./internal/timeout` and replaced all usages with `setTimeout` directly

  previously it was required to abstract away conditionally solving an bun had an issue with `setTimeout`, that caused incorrect behavior
  that bug has since been fixed, and the `isBun` check is no longer needed
  as such the timeout module is also no longer needed

- [#2099](https://github.com/Effect-TS/effect/pull/2099) [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize Effect.zip{Left,Right}

  for the sequential case, avoid using Effect.all internally

## 2.3.1

### Patch Changes

- [#2085](https://github.com/Effect-TS/effect/pull/2085) [`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922) Thanks [@gcanti](https://github.com/gcanti)! - Fix Schedule typings (some APIs didn't have Effect parameters swapped).

## 2.3.0

### Minor Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Runtime.AsyncFiberException` type parameters order from `AsyncFiberException<E, A>` to `AsyncFiberException<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Runtime.Cancel` type parameters order from `Cancel<E, A>` to `Cancel<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Exit` type parameter order from `Exit<E, A>` to `Exit<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Resource` type parameters order from `Resource<E, A>` to `Resource<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `FiberMap` type parameters order from `FiberMap<K, E = unknown, A = unknown>` to `FiberMap<K, A = unknown, E = unknown>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we now require a string key to be provided for all tags and renames the dear old `Tag` to `GenericTag`, so when previously you could do:

  ```ts
  import { Effect, Context } from "effect"
  interface Service {
    readonly _: unique symbol
  }
  const Service = Context.Tag<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >()
  ```

  you are now mandated to do:

  ```ts
  import { Effect, Context } from "effect"
  interface Service {
    readonly _: unique symbol
  }
  const Service = Context.GenericTag<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >("Service")
  ```

  This makes by default all tags globals and ensures better debuggaility when unexpected errors arise.

  Furthermore we introduce a new way of constructing tags that should be considered the new default:

  ```ts
  import { Effect, Context } from "effect"
  class Service extends Context.Tag("Service")<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >() {}

  const program = Effect.flatMap(Service, ({ number }) => number).pipe(
    Effect.flatMap((_) => Effect.log(`number: ${_}`))
  )
  ```

  this will use "Service" as the key and will create automatically an opaque identifier (the class) to be used at the type level, it does something similar to the above in a single shot.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Effect` type parameters order from `Effect<R, E, A>` to `Effect<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `FiberSet` type parameters order from `FiberSet<E, A>` to `FiberSet<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Runtime.RunCallbackOptions` type parameters order from `RunCallbackOptions<E, A>` to `RunCallbackOptions<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `TDeferred` type parameters order from `TDeferred<E, A>` to `TDeferred<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Streamable.Class` and `Effectable.Class` type parameters order from `Class<R, E, A>` to `Class<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we remove the `Data.Data` type and we make `Equal.Equal` & `Hash.Hash` implicit traits.

  The main reason is that `Data.Data<A>` was structurally equivalent to `A & Equal.Equal` but extending `Equal.Equal` doesn't mean that the equality is implemented by-value, so the type was simply adding noise without gaining any level of safety.

  The module `Data` remains unchanged at the value level, all the functions previously available are supposed to work in exactly the same manner.

  At the type level instead the functions return `Readonly` variants, so for example we have:

  ```ts
  import { Data } from "effect"

  const obj = Data.struct({
    a: 0,
    b: 1
  })
  ```

  will have the `obj` typed as:

  ```ts
  declare const obj: {
    readonly a: number
    readonly b: number
  }
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Deferred` type parameters order from `Deferred<E, A>` to `Deferred<A, E>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Fiber` type parameters order from `Fiber<E, A>` to `Fiber<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Channel` type parameters order from `Channel<out Env, in InErr, in InElem, in InDone, out OutErr, out OutElem, out OutDone>` to `Channel<OutElem, InElem = unknown, OutErr = never, InErr = unknown, OutDone = void, InDone = unknown, Env = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Take` type parameters order from `Take<E, A>` to `Take<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `STM` type parameters order from `STM<R, E, A>` to `STM<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Stream` type parameters order from `Stream<R, E, A>` to `Stream<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Pool` type parameters order from `Pool<E, A>` to `Pool<A, E = never>`, and `KeyedPool` from `KeyedPool<E, A>` to `KeyedPool<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Request` type parameters order from `Request<E, A>` to `Request<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `RuntimeFiber` type parameters order from `RuntimeFiber<E, A>` to `RuntimeFiber<A, E = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6) Thanks [@github-actions](https://github.com/apps/github-actions)! - Use `TimeoutException` instead of `NoSuchElementException` for timeout.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Layer` type parameters order from `Layer<RIn, E, ROut>` to `Layer<ROut, E = never, RIn = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - This change enables `Effect.serviceConstants` and `Effect.serviceMembers` to access any constant in the service, not only the effects, namely it is now possible to do:

  ```ts
  import { Effect, Context } from "effect"

  class NumberRepo extends Context.TagClass("NumberRepo")<
    NumberRepo,
    {
      readonly numbers: Array<number>
    }
  >() {
    static numbers = Effect.serviceConstants(NumberRepo).numbers
  }
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e) Thanks [@github-actions](https://github.com/apps/github-actions)! - Rename ReadonlyRecord.update to .replace

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d) Thanks [@github-actions](https://github.com/apps/github-actions)! - enhance DX by swapping type parameters and adding defaults to:

  - Effect
    - async
    - asyncOption
    - asyncEither
  - Stream
    - asyncEffect
    - asyncInterrupt
    - asyncOption
    - asyncScoped
    - identity

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Sink` type parameters order from `Sink<out R, out E, in In, out L, out Z>` to `Sink<out A, in In = unknown, out L = never, out E = never, out R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e) Thanks [@github-actions](https://github.com/apps/github-actions)! - rename ReadonlyRecord.upsert to .set

### Patch Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e) Thanks [@github-actions](https://github.com/apps/github-actions)! - add ReadonlyRecord.modify

- [#2083](https://github.com/Effect-TS/effect/pull/2083) [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add `Ratelimiter` which limits the number of calls to a resource within a time window using the token bucket algorithm.

  Usage Example:

  ```ts
  import { Effect, RateLimiter } from "effect"

  // we need a scope because the rate limiter needs to allocate a state and a background job
  const program = Effect.scoped(
    Effect.gen(function* ($) {
      // create a rate limiter that executes up to 10 requests within 2 seconds
      const rateLimit = yield* $(RateLimiter.make(10, "2 seconds"))
      // simulate repeated calls
      for (let n = 0; n < 100; n++) {
        // wrap the effect we want to limit with rateLimit
        yield* $(rateLimit(Effect.log("Calling RateLimited Effect")))
      }
    })
  )

  // will print 10 calls immediately and then throttle
  program.pipe(Effect.runFork)
  ```

  Or, in a more real world scenario, with a dedicated Service + Layer:

  ```ts
  import { Context, Effect, Layer, RateLimiter } from "effect"

  class ApiLimiter extends Context.Tag("@services/ApiLimiter")<
    ApiLimiter,
    RateLimiter.RateLimiter
  >() {
    static Live = RateLimiter.make(10, "2 seconds").pipe(
      Layer.scoped(ApiLimiter)
    )
  }

  const program = Effect.gen(function* ($) {
    const rateLimit = yield* $(ApiLimiter)
    for (let n = 0; n < 100; n++) {
      yield* $(rateLimit(Effect.log("Calling RateLimited Effect")))
    }
  })

  program.pipe(Effect.provide(ApiLimiter.Live), Effect.runFork)
  ```

- [#2084](https://github.com/Effect-TS/effect/pull/2084) [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify RateLimiter implementation using semaphore

- [#2084](https://github.com/Effect-TS/effect/pull/2084) [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021) Thanks [@tim-smart](https://github.com/tim-smart)! - add Number.nextPow2

  This function returns the next power of 2 from the given number.

  ```ts
  import { nextPow2 } from "effect/Number"

  assert.deepStrictEqual(nextPow2(5), 8)
  assert.deepStrictEqual(nextPow2(17), 32)
  ```

## 2.2.5

### Patch Changes

- [#2075](https://github.com/Effect-TS/effect/pull/2075) [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c) Thanks [@tim-smart](https://github.com/tim-smart)! - add apis for manipulating context to the Runtime module

  These include:

  - `Runtime.updateContext` for modifying the `Context` directly
  - `Runtime.provideService` for adding services to an existing Runtime

  Example:

  ```ts
  import { Context, Runtime } from "effect"

  interface Name {
    readonly _: unique symbol
  }
  const Name = Context.Tag<Name, string>("Name")

  const runtime: Runtime.Runtime<Name> = Runtime.defaultRuntime.pipe(
    Runtime.provideService(Name, "John")
  )
  ```

- [#2075](https://github.com/Effect-TS/effect/pull/2075) [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c) Thanks [@tim-smart](https://github.com/tim-smart)! - add apis for patching runtime flags to the Runtime module

  The apis include:

  - `Runtime.updateRuntimeFlags` for updating all the flags at once
  - `Runtime.enableRuntimeFlag` for enabling a single runtime flag
  - `Runtime.disableRuntimeFlag` for disabling a single runtime flag

## 2.2.4

### Patch Changes

- [#2067](https://github.com/Effect-TS/effect/pull/2067) [`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0) Thanks [@tim-smart](https://github.com/tim-smart)! - add releaseAll api to Semaphore

  You can use `semphore.releaseAll` to atomically release all the permits of a
  Semaphore.

- [#2071](https://github.com/Effect-TS/effect/pull/2071) [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78) Thanks [@tim-smart](https://github.com/tim-smart)! - add Option.orElseSome

  Allows you to specify a default value for an Option, similar to
  Option.getOrElse, except the return value is still an Option.

  ```ts
  import * as O from "effect/Option"
  import { pipe } from "effect/Function"

  assert.deepStrictEqual(
    pipe(
      O.none(),
      O.orElseSome(() => "b")
    ),
    O.some("b")
  )
  assert.deepStrictEqual(
    pipe(
      O.some("a"),
      O.orElseSome(() => "b")
    ),
    O.some("a")
  )
  ```

- [#2057](https://github.com/Effect-TS/effect/pull/2057) [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70) Thanks [@joepjoosten](https://github.com/joepjoosten)! - Fix for possible stack overflow errors when using Array.push with spread operator arguments

- [#2033](https://github.com/Effect-TS/effect/pull/2033) [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60) Thanks [@rehos](https://github.com/rehos)! - Add toJSON for Secret

## 2.2.3

### Patch Changes

- [#2004](https://github.com/Effect-TS/effect/pull/2004) [`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d) Thanks [@IMax153](https://github.com/IMax153)! - add documentation to Effect.intoDeferred

- [#2007](https://github.com/Effect-TS/effect/pull/2007) [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize fiber id hashing

## 2.2.2

### Patch Changes

- [#1970](https://github.com/Effect-TS/effect/pull/1970) [`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d) Thanks [@IMax153](https://github.com/IMax153)! - execute acquire in `ScopedRef` uninterruptibly

- [#1971](https://github.com/Effect-TS/effect/pull/1971) [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b) Thanks [@IMax153](https://github.com/IMax153)! - race interruptibly in `Channel.mergeAllWith`

## 2.2.1

### Patch Changes

- [#1964](https://github.com/Effect-TS/effect/pull/1964) [`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix `sortWith` sig, closes #1961

- [#1958](https://github.com/Effect-TS/effect/pull/1958) [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb) Thanks [@gcanti](https://github.com/gcanti)! - Fix signatures related to predicates, closes #1916

## 2.2.0

### Minor Changes

- [#1951](https://github.com/Effect-TS/effect/pull/1951) [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9) Thanks [@github-actions](https://github.com/apps/github-actions)! - make data-last FiberSet.run accept an Effect

- [#1951](https://github.com/Effect-TS/effect/pull/1951) [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9) Thanks [@github-actions](https://github.com/apps/github-actions)! - make data-last FiberMap.run accept an Effect

### Patch Changes

- [#1957](https://github.com/Effect-TS/effect/pull/1957) [`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2) Thanks [@IMax153](https://github.com/IMax153)! - cache `FiberId` hash in the constructor

- [#1951](https://github.com/Effect-TS/effect/pull/1951) [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Fiber{Map,Set}.makeRuntime

- [#1951](https://github.com/Effect-TS/effect/pull/1951) [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Fiber{Set,Map}.runtime api

- [#1952](https://github.com/Effect-TS/effect/pull/1952) [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874) Thanks [@tim-smart](https://github.com/tim-smart)! - avoid sleep for zero duration in schedule

## 2.1.2

### Patch Changes

- [#1949](https://github.com/Effect-TS/effect/pull/1949) [`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625) Thanks [@TylorS](https://github.com/TylorS)! - Fix runFork with Scope

## 2.1.1

### Patch Changes

- [#1934](https://github.com/Effect-TS/effect/pull/1934) [`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: add `mapKeys` / `mapEntries`

## 2.1.0

### Minor Changes

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add immediate:boolean flag to runFork/runCallback

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - Improve Effect.retry options

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - remove Effect.retry\* variants

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - Allow providing Scope to Runtime.runFork

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - Add RunForkOptions to Effect.runFork

### Patch Changes

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Effect.repeat options overload

## 2.0.5

### Patch Changes

- [#1920](https://github.com/Effect-TS/effect/pull/1920) [`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberMap.remove

## 2.0.4

### Patch Changes

- [#1897](https://github.com/Effect-TS/effect/pull/1897) [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberSet module

- [#1891](https://github.com/Effect-TS/effect/pull/1891) [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8) Thanks [@gcanti](https://github.com/gcanti)! - Types: add `MatchRecord`

- [#1871](https://github.com/Effect-TS/effect/pull/1871) [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5) Thanks [@SandroMaglione](https://github.com/SandroMaglione)! - added Trie module

- [#1897](https://github.com/Effect-TS/effect/pull/1897) [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51) Thanks [@tim-smart](https://github.com/tim-smart)! - add MutableHashMap.clear

- [#1903](https://github.com/Effect-TS/effect/pull/1903) [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be) Thanks [@fubhy](https://github.com/fubhy)! - Converted value bag classes to object literals

- [#1891](https://github.com/Effect-TS/effect/pull/1891) [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8) Thanks [@gcanti](https://github.com/gcanti)! - Struct: fix `pick` signature

- [#1897](https://github.com/Effect-TS/effect/pull/1897) [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberMap module

- [#1891](https://github.com/Effect-TS/effect/pull/1891) [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8) Thanks [@gcanti](https://github.com/gcanti)! - Struct: add `get`

- [#1891](https://github.com/Effect-TS/effect/pull/1891) [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8) Thanks [@gcanti](https://github.com/gcanti)! - Struct: fix `omit` signature

- [#1894](https://github.com/Effect-TS/effect/pull/1894) [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217) Thanks [@tim-smart](https://github.com/tim-smart)! - allow pre-validated cron expressions for Schedule.cron

- [#1897](https://github.com/Effect-TS/effect/pull/1897) [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51) Thanks [@tim-smart](https://github.com/tim-smart)! - add MutableHashSet.clear

## 2.0.3

### Patch Changes

- [#1884](https://github.com/Effect-TS/effect/pull/1884) [`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b) Thanks [@fubhy](https://github.com/fubhy)! - Added `Cron` module and `Schedule.cron` constructor

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid killing all fibers on interrupt

## 2.0.2

### Patch Changes

- [#1850](https://github.com/Effect-TS/effect/pull/1850) [`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add index argument to many functions in ReadonlyArray

## 2.0.1

### Patch Changes

- [#1859](https://github.com/Effect-TS/effect/pull/1859) [`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071) Thanks [@sukovanej](https://github.com/sukovanej)! - Include Config.LiteralValue in dts.

## 2.0.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1797](https://github.com/Effect-TS/effect/pull/1797) [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95) Thanks [@matheuspuel](https://github.com/matheuspuel)! - make serviceFunctions and similar accept an Effect as the service

- [#1854](https://github.com/Effect-TS/effect/pull/1854) [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09) Thanks [@gcanti](https://github.com/gcanti)! - Add Option-returning overloads for findFirst and findLast in ReadonlyArray

- [#1795](https://github.com/Effect-TS/effect/pull/1795) [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add Config.literal

- [#1848](https://github.com/Effect-TS/effect/pull/1848) [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7) Thanks [@fubhy](https://github.com/fubhy)! - Avoid default parameter initilization

- [#1847](https://github.com/Effect-TS/effect/pull/1847) [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa) Thanks [@fubhy](https://github.com/fubhy)! - Avoid inline creation & spreading of objects and arrays

- [#1798](https://github.com/Effect-TS/effect/pull/1798) [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - Uncommented linesIterator string function

## 2.0.0-next.62

### Minor Changes

- [#1780](https://github.com/Effect-TS/effect/pull/1780) [`d6dd74e`](https://github.com/Effect-TS/effect/commit/d6dd74e191d3c798b08718b1326abc94982358ec) Thanks [@tim-smart](https://github.com/tim-smart)! - use NoSuchElementException for more optional apis

### Patch Changes

- [#1785](https://github.com/Effect-TS/effect/pull/1785) [`11a6910`](https://github.com/Effect-TS/effect/commit/11a6910f562e838b379ebc5edac94abb49d3a8e0) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify Match extraction types

- [#1782](https://github.com/Effect-TS/effect/pull/1782) [`1f398cf`](https://github.com/Effect-TS/effect/commit/1f398cf35008ec59f820338adeb2f4e2b928b1fb) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.empty

- [#1786](https://github.com/Effect-TS/effect/pull/1786) [`d27b68b`](https://github.com/Effect-TS/effect/commit/d27b68b7e3a57f77039fde78bf4c9924dc9d8226) Thanks [@tim-smart](https://github.com/tim-smart)! - only add one predicate in Match.discriminators

## 2.0.0-next.61

### Patch Changes

- [#1768](https://github.com/Effect-TS/effect/pull/1768) [`7c6b90c`](https://github.com/Effect-TS/effect/commit/7c6b90c507835871bdefacdf0e0f84cb87febf16) Thanks [@gcanti](https://github.com/gcanti)! - Effect.mergeAll should work when Z is an iterable, closes #1765

- [#1772](https://github.com/Effect-TS/effect/pull/1772) [`a1ba0c4`](https://github.com/Effect-TS/effect/commit/a1ba0c4dbbc8ee0a8d3652feabbf3c0accdbe3de) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: add `fromIterableBy`

- [#1778](https://github.com/Effect-TS/effect/pull/1778) [`2c5a401`](https://github.com/Effect-TS/effect/commit/2c5a401a0be13b709c83365acf6a49a52896711f) Thanks [@IMax153](https://github.com/IMax153)! - add ConfigProvider.fromJson to support loading configuration from a JSON object

- [#1770](https://github.com/Effect-TS/effect/pull/1770) [`d4d403e`](https://github.com/Effect-TS/effect/commit/d4d403e60d9ae81a69aa1190f50e6f9cb11651f3) Thanks [@tim-smart](https://github.com/tim-smart)! - adjust metric boundaries for timer histograms

- [#1776](https://github.com/Effect-TS/effect/pull/1776) [`4c22ed5`](https://github.com/Effect-TS/effect/commit/4c22ed51b6f6458166d1151b1eaef0fe4ac2f5e4) Thanks [@fubhy](https://github.com/fubhy)! - Self-assign normalized `BigDecimal`

## 2.0.0-next.60

### Minor Changes

- [#1755](https://github.com/Effect-TS/effect/pull/1755) [`0200f12`](https://github.com/Effect-TS/effect/commit/0200f1263dcfd769ed6b381036207a583b34964c) Thanks [@gcanti](https://github.com/gcanti)! - Effect: remove `config` API (since `Config` now implements `Effect`)

- [#1747](https://github.com/Effect-TS/effect/pull/1747) [`83db34e`](https://github.com/Effect-TS/effect/commit/83db34eb4080909b3ae7536886d27870e77d8b7e) Thanks [@fubhy](https://github.com/fubhy)! - Generate proxy packages

### Patch Changes

- [#1756](https://github.com/Effect-TS/effect/pull/1756) [`7c1dcc7`](https://github.com/Effect-TS/effect/commit/7c1dcc732c735a6f3f64274be4b6daea6e9fdde6) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix stack filtering for first throw point

- [#1753](https://github.com/Effect-TS/effect/pull/1753) [`1727ca5`](https://github.com/Effect-TS/effect/commit/1727ca5011d62b5353ed7c53bf1867dc37a41954) Thanks [@IMax153](https://github.com/IMax153)! - expose Console service tag

- [#1749](https://github.com/Effect-TS/effect/pull/1749) [`299e8b5`](https://github.com/Effect-TS/effect/commit/299e8b5e085a624d1141b5fdaf00fc50203c57fa) Thanks [@IMax153](https://github.com/IMax153)! - fix the jsdoc for Effect.withConsoleScoped

- [#1758](https://github.com/Effect-TS/effect/pull/1758) [`88d957d`](https://github.com/Effect-TS/effect/commit/88d957d724b390e005fb245b9deadfcdbd4a55d1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix provideSomeRuntime internals, restore context and flags properly

- [#1754](https://github.com/Effect-TS/effect/pull/1754) [`6a95cc0`](https://github.com/Effect-TS/effect/commit/6a95cc0f38914b63a3884697e410f79c75add185) Thanks [@tim-smart](https://github.com/tim-smart)! - make Config implement Effect

## 2.0.0-next.59

### Minor Changes

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - rename FiberRefs.updatedAs to FiberRef.updateAs

- [#1738](https://github.com/Effect-TS/effect/pull/1738) [`d4abb06`](https://github.com/Effect-TS/effect/commit/d4abb06a411cc088d1eb20d853c3a9da97d4f847) Thanks [@gcanti](https://github.com/gcanti)! - ReaonlyRecord: rename `fromIterable` to `fromIterableWith` and add standard `fromIterable` API

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - use native js data types for Metrics

### Patch Changes

- [#1733](https://github.com/Effect-TS/effect/pull/1733) [`8177e4c`](https://github.com/Effect-TS/effect/commit/8177e4cc50eba7534b794ddaabb7754641060e9b) Thanks [@IMax153](https://github.com/IMax153)! - add `withConsoleScoped` to `Console`/`Effect` modules

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of unzip

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - prefer Date.now() over new Date().getTime()

- [#1735](https://github.com/Effect-TS/effect/pull/1735) [`cf4c044`](https://github.com/Effect-TS/effect/commit/cf4c044d799ae1249084abfd59d7f2ecd4a7c755) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Layer MemoMap apis

- [#1724](https://github.com/Effect-TS/effect/pull/1724) [`1884fa3`](https://github.com/Effect-TS/effect/commit/1884fa3f18c0ae85f62af338f1ac5863ad24f778) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: fix the tacit use of flatten

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of reverse

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of dedupe

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberRefs.updateManyAs

- [#1737](https://github.com/Effect-TS/effect/pull/1737) [`9c26f58`](https://github.com/Effect-TS/effect/commit/9c26f58715c386885e25fa30662ad8c77576c22e) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: add splitNonEmptyAt

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - short circuit for empty patches

- [#1736](https://github.com/Effect-TS/effect/pull/1736) [`8249277`](https://github.com/Effect-TS/effect/commit/82492774087746a1174353480465c439388f88f4) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: add splitWhere

- [#1729](https://github.com/Effect-TS/effect/pull/1729) [`3c77e12`](https://github.com/Effect-TS/effect/commit/3c77e12d92030413e25f8a32ab84a4feb15c5164) Thanks [@jessekelly881](https://github.com/jessekelly881)! - updated BigDecimal.toString

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - Chunk > flatMap: fix return type

- [#1736](https://github.com/Effect-TS/effect/pull/1736) [`8249277`](https://github.com/Effect-TS/effect/commit/82492774087746a1174353480465c439388f88f4) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: add split

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix sortBy signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix chop signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - List > flatMap: fix return type

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - replace use of throw in fiber runtime

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize FiberRef.update/forkAs

- [#1724](https://github.com/Effect-TS/effect/pull/1724) [`1884fa3`](https://github.com/Effect-TS/effect/commit/1884fa3f18c0ae85f62af338f1ac5863ad24f778) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of flatten

- [#1727](https://github.com/Effect-TS/effect/pull/1727) [`9b5f72d`](https://github.com/Effect-TS/effect/commit/9b5f72d6bb9efd22f52c64c727b79f29d94507d3) Thanks [@photomoose](https://github.com/photomoose)! - Fix number of retries in retryN

- [#1735](https://github.com/Effect-TS/effect/pull/1735) [`cf4c044`](https://github.com/Effect-TS/effect/commit/cf4c044d799ae1249084abfd59d7f2ecd4a7c755) Thanks [@tim-smart](https://github.com/tim-smart)! - fix memoization of Layer.effect/scoped

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix dedupeWith signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray > flatMap: fix return type

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize MutableHashMap

- [#1745](https://github.com/Effect-TS/effect/pull/1745) [`c142caa`](https://github.com/Effect-TS/effect/commit/c142caa725646929d8086d8e63d7a406fd2415da) Thanks [@IMax153](https://github.com/IMax153)! - rename ConfigSecret to Secret

- [#1733](https://github.com/Effect-TS/effect/pull/1733) [`8177e4c`](https://github.com/Effect-TS/effect/commit/8177e4cc50eba7534b794ddaabb7754641060e9b) Thanks [@IMax153](https://github.com/IMax153)! - export `Console` combinators from the `Effect` module to match other default services

## 2.0.0-next.58

### Patch Changes

- [#1722](https://github.com/Effect-TS/effect/pull/1722) [`b5569e3`](https://github.com/Effect-TS/effect/commit/b5569e358534da41047a687afbc85dbe8517ddca) Thanks [@tim-smart](https://github.com/tim-smart)! - update build setup to put cjs in root directory

- [#1720](https://github.com/Effect-TS/effect/pull/1720) [`56a0334`](https://github.com/Effect-TS/effect/commit/56a033456c3285ff95fdbeeddff2bda6a1e39bec) Thanks [@tim-smart](https://github.com/tim-smart)! - fix jsdoc for Inspectable.format

## 2.0.0-next.57

### Minor Changes

- [#1701](https://github.com/Effect-TS/effect/pull/1701) [`739460b06`](https://github.com/Effect-TS/effect/commit/739460b0609cd490abbb0a8dfbe3dfe9f67a3680) Thanks [@fubhy](https://github.com/fubhy)! - Allow to set a custom description for timer metrics

- [#1704](https://github.com/Effect-TS/effect/pull/1704) [`accf8a647`](https://github.com/Effect-TS/effect/commit/accf8a647b7a869d2de445e430dab07f08aac0cc) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray.compact` and `ReadonlyRecord.compact` to `.getSomes`

- [#1716](https://github.com/Effect-TS/effect/pull/1716) [`023b512bd`](https://github.com/Effect-TS/effect/commit/023b512bd0b3d5a91bbe85b262e8762e5ce3ac21) Thanks [@gcanti](https://github.com/gcanti)! - List: merge NonEmpty APIs into base ones

- [#1717](https://github.com/Effect-TS/effect/pull/1717) [`869c9c31d`](https://github.com/Effect-TS/effect/commit/869c9c31de2d297bc2937ca6b0a417c10ed1a12f) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: merge NonEmpty APIs into base ones

- [#1713](https://github.com/Effect-TS/effect/pull/1713) [`906343263`](https://github.com/Effect-TS/effect/commit/906343263f6306965602422508ef3c7158dd7cc8) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: rename `toString` to `format`

- [#1688](https://github.com/Effect-TS/effect/pull/1688) [`9698427fe`](https://github.com/Effect-TS/effect/commit/9698427fea446a08b702d3f820db96753efad638) Thanks [@tim-smart](https://github.com/tim-smart)! - replace Layer.provide* with Layer.use*

- [#1711](https://github.com/Effect-TS/effect/pull/1711) [`ff6fadb93`](https://github.com/Effect-TS/effect/commit/ff6fadb934fef37dec1f58eaeff40c0d027393bb) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: merge NonEmpty APIs into base ones

- [#1707](https://github.com/Effect-TS/effect/pull/1707) [`fb1a98fab`](https://github.com/Effect-TS/effect/commit/fb1a98fab613c7ec34abf35c348f3cadcc7d943d) Thanks [@gcanti](https://github.com/gcanti)! - Layer: rename `zipWithPar` to `zipWith` (standard)

### Patch Changes

- [#1690](https://github.com/Effect-TS/effect/pull/1690) [`eb6d7aada`](https://github.com/Effect-TS/effect/commit/eb6d7aada122b260b52e53ff2fd28bfe851b7f40) Thanks [@tim-smart](https://github.com/tim-smart)! - allow omission of Scope type in R of Stream.asyncScoped

- [#1704](https://github.com/Effect-TS/effect/pull/1704) [`accf8a647`](https://github.com/Effect-TS/effect/commit/accf8a647b7a869d2de445e430dab07f08aac0cc) Thanks [@fubhy](https://github.com/fubhy)! - Added `.getLefts` and `.getRights`

- [#1703](https://github.com/Effect-TS/effect/pull/1703) [`f8d27500d`](https://github.com/Effect-TS/effect/commit/f8d27500dae8eb23ff8b93e8b894a4ab4ec6ebad) Thanks [@jessekelly881](https://github.com/jessekelly881)! - improved Duration.toString

- [#1689](https://github.com/Effect-TS/effect/pull/1689) [`a0bd532e8`](https://github.com/Effect-TS/effect/commit/a0bd532e85fa603b29e58c6a2670433b0346377a) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - improve `Pool`'s `makeWithTTL` JSDoc example

- [#1715](https://github.com/Effect-TS/effect/pull/1715) [`8b1a7e8a1`](https://github.com/Effect-TS/effect/commit/8b1a7e8a1acddec126b4292fc24154f6df615f0a) Thanks [@tim-smart](https://github.com/tim-smart)! - only add onInterrupt in Effect.async if required

- [#1694](https://github.com/Effect-TS/effect/pull/1694) [`33ffa62b4`](https://github.com/Effect-TS/effect/commit/33ffa62b444db82afc0e43154eb4b3576761c583) Thanks [@extremegf](https://github.com/extremegf)! - Add Either.filterOrLeft

- [#1695](https://github.com/Effect-TS/effect/pull/1695) [`7ccd1eb0b`](https://github.com/Effect-TS/effect/commit/7ccd1eb0b71ec84033d2b106412ccfcac7753e4c) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Option.andThen

- [#1706](https://github.com/Effect-TS/effect/pull/1706) [`8a1e98ce3`](https://github.com/Effect-TS/effect/commit/8a1e98ce33344347f6edec0fc89c4c22d8393e90) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve consistency between request batching and fiber environment.

  In prior releases request batching required operators that act on fiber context such as `Effect.locally` to be aware of batching in order to avoid bugs where the effect executed post batching would lose the fiber environment (context, refs, and flags).

  This change restructure how batching internally works, inside the fiber we now slice up the stack and restore the exact context that was destroyed, by rewriting the internals of forEach batching is now transparent to any other function that deals with fiber state.

- [#1687](https://github.com/Effect-TS/effect/pull/1687) [`e4d90ed38`](https://github.com/Effect-TS/effect/commit/e4d90ed3896f6d00e8470e73e0d9f597504fc888) Thanks [@matheuspuel](https://github.com/matheuspuel)! - fix YieldableError.toString crashing on react-native

- [#1681](https://github.com/Effect-TS/effect/pull/1681) [`e5cd27c7d`](https://github.com/Effect-TS/effect/commit/e5cd27c7d5988902b238d568d6d13470babb8ee9) Thanks [@matheuspuel](https://github.com/matheuspuel)! - forbid excess properties when matching tags

- [#1692](https://github.com/Effect-TS/effect/pull/1692) [`37a7cfe94`](https://github.com/Effect-TS/effect/commit/37a7cfe94f3baa51fb465c1f6591f20d2aab5c7f) Thanks [@tim-smart](https://github.com/tim-smart)! - add PrimaryKey.value

- [#1679](https://github.com/Effect-TS/effect/pull/1679) [`c1146e473`](https://github.com/Effect-TS/effect/commit/c1146e47343a39e0d168f10547df43d0728df50d) Thanks [@k44](https://github.com/k44)! - fix error value of `Effect.tryPromise`

- [#1719](https://github.com/Effect-TS/effect/pull/1719) [`30893ed48`](https://github.com/Effect-TS/effect/commit/30893ed48592460b8bbef6388802893ed9f0f23f) Thanks [@tim-smart](https://github.com/tim-smart)! - add Request.failCause

- [#1712](https://github.com/Effect-TS/effect/pull/1712) [`e2ccf5120`](https://github.com/Effect-TS/effect/commit/e2ccf512088e0dfb0e3816ec259d4f6736f5cf28) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - fix ReadonlyArray.difference description

- [#1715](https://github.com/Effect-TS/effect/pull/1715) [`8b1a7e8a1`](https://github.com/Effect-TS/effect/commit/8b1a7e8a1acddec126b4292fc24154f6df615f0a) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify Effect.tryCatch implementation

- [#1684](https://github.com/Effect-TS/effect/pull/1684) [`aeb33b158`](https://github.com/Effect-TS/effect/commit/aeb33b158b14ea1a28fb78954adb717019f913a1) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - change typo in Either documentation

- [#1699](https://github.com/Effect-TS/effect/pull/1699) [`06eb1d380`](https://github.com/Effect-TS/effect/commit/06eb1d3801ae6ef93412529af3ef37b509cba7ef) Thanks [@gcanti](https://github.com/gcanti)! - Config: standardize error messages

- [#1683](https://github.com/Effect-TS/effect/pull/1683) [`a6a78ccad`](https://github.com/Effect-TS/effect/commit/a6a78ccad976c510cf0d6a33eee5e10697b310da) Thanks [@tim-smart](https://github.com/tim-smart)! - add default type to data class props generic

- [#1718](https://github.com/Effect-TS/effect/pull/1718) [`3b0768ce6`](https://github.com/Effect-TS/effect/commit/3b0768ce68035fe8a2b017b736f24ab3bcce350b) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - get rid `absorb` mention

- [#1686](https://github.com/Effect-TS/effect/pull/1686) [`9f4d2874d`](https://github.com/Effect-TS/effect/commit/9f4d2874da7568eafd14c183d127132788f86668) Thanks [@gcanti](https://github.com/gcanti)! - Types: add variance helpers

- [#1697](https://github.com/Effect-TS/effect/pull/1697) [`e1a4b6a63`](https://github.com/Effect-TS/effect/commit/e1a4b6a63d73aa111015652bfe4584b767a53e61) Thanks [@tim-smart](https://github.com/tim-smart)! - expose currentConcurrency fiber ref

## 2.0.0-next.56

### Minor Changes

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - support Promise in Effect.andThen and .tap

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cause.UnknownException and use it over `unknown`

- [#1678](https://github.com/Effect-TS/effect/pull/1678) [`8ed7626a4`](https://github.com/Effect-TS/effect/commit/8ed7626a49f1a4fb1b9315d97008355f1b6962ef) Thanks [@tim-smart](https://github.com/tim-smart)! - use `new` for Cause error constructors

### Patch Changes

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TDeferred: fix E, A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SynchronizedRef: fix A variance (from covariant to invariant)

- [#1661](https://github.com/Effect-TS/effect/pull/1661) [`6c32d12d7`](https://github.com/Effect-TS/effect/commit/6c32d12d7be5eb829dc5d8fe576f4fda8217ea6d) Thanks [@fubhy](https://github.com/fubhy)! - Use `sideEffects: []` in package.json

- [#1663](https://github.com/Effect-TS/effect/pull/1663) [`69bcb5b7a`](https://github.com/Effect-TS/effect/commit/69bcb5b7ab4c4faa873cf8132172e68fc8eb9b6d) Thanks [@tim-smart](https://github.com/tim-smart)! - add TaggedClass to /request

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support undefined values in TPubSub

- [#1658](https://github.com/Effect-TS/effect/pull/1658) [`396428a73`](https://github.com/Effect-TS/effect/commit/396428a73871715a6aed632c2c5b5affb2e509ac) Thanks [@wmaurer](https://github.com/wmaurer)! - ReadonlyArray: Improved refinement typings for partition

- [#1672](https://github.com/Effect-TS/effect/pull/1672) [`80bf68da5`](https://github.com/Effect-TS/effect/commit/80bf68da546fecf91e3ebcd43c8d4798841227df) Thanks [@tim-smart](https://github.com/tim-smart)! - add metric .register() for forcing addition to registry

- [#1669](https://github.com/Effect-TS/effect/pull/1669) [`541330b11`](https://github.com/Effect-TS/effect/commit/541330b110fc3d5f463f34cb48490e25b29036ae) Thanks [@tim-smart](https://github.com/tim-smart)! - add PrimaryKey module

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: make Key invariant

- [#1664](https://github.com/Effect-TS/effect/pull/1664) [`54ce5e638`](https://github.com/Effect-TS/effect/commit/54ce5e63882136d77b50ebe6613db4f349bb0195) Thanks [@gcanti](https://github.com/gcanti)! - PollingMetric: renamed to MetricPolling (standard)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Deferred: fix E and A variance (from covariant to invariant)

- [#1660](https://github.com/Effect-TS/effect/pull/1660) [`ecc334703`](https://github.com/Effect-TS/effect/commit/ecc3347037965df8f6e6e19423f4c0cfea7e04b7) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: swap findFirst > predicate arguments (standard)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TSet: fix A variance (from covariant to invariant)

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Auto-flattening Effect.tap

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - RequestResolver: fix A variance (from covariant to contravariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - ScopedRef: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Reloadable: fix A variance (from covariant to invariant)

- [#1660](https://github.com/Effect-TS/effect/pull/1660) [`ecc334703`](https://github.com/Effect-TS/effect/commit/ecc3347037965df8f6e6e19423f4c0cfea7e04b7) Thanks [@gcanti](https://github.com/gcanti)! - fix ReadonlyRecord.partition signature

- [#1670](https://github.com/Effect-TS/effect/pull/1670) [`c3bfc90e4`](https://github.com/Effect-TS/effect/commit/c3bfc90e4af20c2f2e8e3c663690779d4332f86e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Request.Class

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Resource: fix E, A variance (from covariant to invariant)

- [#1674](https://github.com/Effect-TS/effect/pull/1674) [`c687a8701`](https://github.com/Effect-TS/effect/commit/c687a870157e1c212f29ddb3264db0200d03466e) Thanks [@fubhy](https://github.com/fubhy)! - Allow hrtime as `Duration` input

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support undefined values in TQueue

- [#1668](https://github.com/Effect-TS/effect/pull/1668) [`fc9bce6a2`](https://github.com/Effect-TS/effect/commit/fc9bce6a24b1fc46955d276ed0011a93378b3297) Thanks [@gcanti](https://github.com/gcanti)! - Config: propagate the path in validation, closes #1667

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - PubSub: fix A variance (from contravariant to invariant)

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support null values in PubSub

- [#1655](https://github.com/Effect-TS/effect/pull/1655) [`0c6330db0`](https://github.com/Effect-TS/effect/commit/0c6330db0dac8264d9a9e2ca8babea01a054317a) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: revert changing methods to props (RE: #1644)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - FiberRef: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - StrategyVariance: fix A variance (from covariant to invariant)

- [#1678](https://github.com/Effect-TS/effect/pull/1678) [`8ed7626a4`](https://github.com/Effect-TS/effect/commit/8ed7626a49f1a4fb1b9315d97008355f1b6962ef) Thanks [@tim-smart](https://github.com/tim-smart)! - Cause.YieldableError extends Inspectable

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TMap: fix K, V variance (from covariant to invariant)

- [#1665](https://github.com/Effect-TS/effect/pull/1665) [`a00b920b8`](https://github.com/Effect-TS/effect/commit/a00b920b8910f975ff61be48c1538de527fa290b) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: fix partition signature (expose the index of the element)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Pool: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Cache / ConsumerCache: fix Key variance (from contravariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SubscriptionRef: fix A variance (from covariant to invariant)

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce Types.NoInfer

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SortedSet: make A invariant

- [#1654](https://github.com/Effect-TS/effect/pull/1654) [`d2b7e0ef0`](https://github.com/Effect-TS/effect/commit/d2b7e0ef022234ceba0c3b77afdc3285081ece97) Thanks [@wmaurer](https://github.com/wmaurer)! - Added refinement overloads to Sink.collectAllWhile, Stream.partition and Stream.takeWhile. Added dtslint tests for Sink and Stream functions with refinement overloads

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: make K invariant

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce Effect.andThen

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TArray: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - KeyedPool: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TPubSub: make A invariant

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - move internal exceptions into core

## 2.0.0-next.55

### Patch Changes

- [#1648](https://github.com/Effect-TS/effect/pull/1648) [`b2cbb6a79`](https://github.com/Effect-TS/effect/commit/b2cbb6a7946590411ce2d48df19c1b4795415945) Thanks [@gcanti](https://github.com/gcanti)! - Cause: fix exception constructors (should respect `exactOptionalPropertyTypes: true` when creating `message` prop)

- [#1613](https://github.com/Effect-TS/effect/pull/1613) [`2dee48696`](https://github.com/Effect-TS/effect/commit/2dee48696b70abde7dffea2a52f98dd0306f3649) Thanks [@gcanti](https://github.com/gcanti)! - Types: add Mutable helper

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - SortedSet: make fromIterable dual

- [#1608](https://github.com/Effect-TS/effect/pull/1608) [`a9082c91c`](https://github.com/Effect-TS/effect/commit/a9082c91c2e64864b8e8f573362f62462490a5df) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix off-by-one in Random.shuffle

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add entries

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TSet: replace toReadonlyArray with toArray

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: rename reduceWithIndex / reduceWithIndexSTM to reduce / reduceSTM

- [#1649](https://github.com/Effect-TS/effect/pull/1649) [`a3cda801a`](https://github.com/Effect-TS/effect/commit/a3cda801a8f8491ecc5286efa1364d9169a76aa5) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: replace 0-arity functions with values

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: removeIf returns `Array<[K, V]>` instead of `Array<readonly [K, V]>`

- [#1642](https://github.com/Effect-TS/effect/pull/1642) [`b2fdff3b8`](https://github.com/Effect-TS/effect/commit/b2fdff3b83d566c37a499fa58f9f1492f8219e0f) Thanks [@gcanti](https://github.com/gcanti)! - TMap: merge removeIf / removeIfDiscard, retainIf / retainIf (`{ discard: boolean }` optional argument)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Duration: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: replace toReadonlyMap with toMap

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Duration: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1638](https://github.com/Effect-TS/effect/pull/1638) [`4eedf057b`](https://github.com/Effect-TS/effect/commit/4eedf057b38c09ea1a6bc5b85c886edb02681d54) Thanks [@gcanti](https://github.com/gcanti)! - Predicate: exclude functions from `isRecord`

- [#1645](https://github.com/Effect-TS/effect/pull/1645) [`d2e15f377`](https://github.com/Effect-TS/effect/commit/d2e15f377f55fb4a3f2114bd148f5e7eba52643a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.withSpanAnnotations

- [#1611](https://github.com/Effect-TS/effect/pull/1611) [`8b22648aa`](https://github.com/Effect-TS/effect/commit/8b22648aa8153d31c2435c62e826e3211b2e2cd7) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure pool acquire is interruptible when allocated dynamically

- [#1642](https://github.com/Effect-TS/effect/pull/1642) [`b2fdff3b8`](https://github.com/Effect-TS/effect/commit/b2fdff3b83d566c37a499fa58f9f1492f8219e0f) Thanks [@gcanti](https://github.com/gcanti)! - TSet: merge removeIf / removeIfDiscard, retainIf / retainIf (`{ discard: boolean }` optional argument)

- [#1647](https://github.com/Effect-TS/effect/pull/1647) [`82006f69b`](https://github.com/Effect-TS/effect/commit/82006f69b9af9bc70a06ee1abfdc9c24777025c6) Thanks [@gcanti](https://github.com/gcanti)! - turn on exactOptionalPropertyTypes

- [#1626](https://github.com/Effect-TS/effect/pull/1626) [`2e99983ef`](https://github.com/Effect-TS/effect/commit/2e99983ef3e3cf5884c831e8b25d94f4846f739a) Thanks [@gcanti](https://github.com/gcanti)! - Fix Ref Variance

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: add toArray

- [#1619](https://github.com/Effect-TS/effect/pull/1619) [`66e6939ea`](https://github.com/Effect-TS/effect/commit/66e6939ea0f124c0a9c672ab5d8db7dc9d4ccaa2) Thanks [@gcanti](https://github.com/gcanti)! - remove readonly tuples from return type when possible

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Order: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: replace toArray with toChunk

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: change entries to return IterableIterator<[K, V]>

- [#1644](https://github.com/Effect-TS/effect/pull/1644) [`6e2c84d4c`](https://github.com/Effect-TS/effect/commit/6e2c84d4c3b618e355b2ef9141cef973da4768b9) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: add readonly modifiers when missing and remove bivariance by changing methods to props

- [#1607](https://github.com/Effect-TS/effect/pull/1607) [`e7101ef05`](https://github.com/Effect-TS/effect/commit/e7101ef05125f3fc60ee5e3717eda30b6fa05c4d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove potentially offenive language

- [#1639](https://github.com/Effect-TS/effect/pull/1639) [`b27958bc5`](https://github.com/Effect-TS/effect/commit/b27958bc5206b4bdb5bcc0032041df6846f6ebbf) Thanks [@gcanti](https://github.com/gcanti)! - Match: fix record signature (remove any from the codomain)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - List: replace toReadonlyArray with toArray

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: make fromIterable dual

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Number: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TSet: fix toChunk (was returning an array)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Number: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigInt: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigInt: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add toEntries

- [#1641](https://github.com/Effect-TS/effect/pull/1641) [`f0a4bf430`](https://github.com/Effect-TS/effect/commit/f0a4bf430c0d723e4d6e3f3fb48dcc7118338653) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: fix bug in Hash and Equal implementation

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: fix toChunk (was returning an array)

- [#1606](https://github.com/Effect-TS/effect/pull/1606) [`265f60842`](https://github.com/Effect-TS/effect/commit/265f608424c50d7bc9eac74e551db6d8db66cdb2) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.mapInputOptions

- [#1632](https://github.com/Effect-TS/effect/pull/1632) [`c86f87c1b`](https://github.com/Effect-TS/effect/commit/c86f87c1b7923ae8e66bb99d9282b35f38e16774) Thanks [@gcanti](https://github.com/gcanti)! - Either: rename `reverse` to `flip` (to align with `Effect.flip`)

- [#1599](https://github.com/Effect-TS/effect/pull/1599) [`c3cb2dff7`](https://github.com/Effect-TS/effect/commit/c3cb2dff73f2e7293ab937bb6978995fb23d2547) Thanks [@gcanti](https://github.com/gcanti)! - add Refinement overloading to Effect.loop

- [#1638](https://github.com/Effect-TS/effect/pull/1638) [`4eedf057b`](https://github.com/Effect-TS/effect/commit/4eedf057b38c09ea1a6bc5b85c886edb02681d54) Thanks [@gcanti](https://github.com/gcanti)! - Match: add `symbol` predicate

- [#1640](https://github.com/Effect-TS/effect/pull/1640) [`9ea7edf77`](https://github.com/Effect-TS/effect/commit/9ea7edf775acc05b5a763310e6c4afecfda7a52c) Thanks [@gcanti](https://github.com/gcanti)! - fix link in "please report an issue..." message

- [#1597](https://github.com/Effect-TS/effect/pull/1597) [`38643141d`](https://github.com/Effect-TS/effect/commit/38643141d55cdd8f47c96904a199f218bd890037) Thanks [@gcanti](https://github.com/gcanti)! - add Refinement overloading to Effect.iterate, closes #1596

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: make fromIterable dual

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Order: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: retainIf returns `Array<[K, V]>` instead of `Array<readonly [K, V]>`

- [#1630](https://github.com/Effect-TS/effect/pull/1630) [`67025357e`](https://github.com/Effect-TS/effect/commit/67025357e9c705cf68d9b7e8ffb942f567720e88) Thanks [@gcanti](https://github.com/gcanti)! - Tuple: rename `tuple` to `make` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: replace toReadonlyArray with toArray

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: replace toReadonlyArray with toArray

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

## 2.0.0-next.54

### Patch Changes

- [#1594](https://github.com/Effect-TS/effect/pull/1594) [`a3a31c722`](https://github.com/Effect-TS/effect/commit/a3a31c722dbf006f612f5909ff9b1a1f2d99c050) Thanks [@tim-smart](https://github.com/tim-smart)! - fix regression in process.hrtime detection

## 2.0.0-next.53

### Minor Changes

- [#1562](https://github.com/Effect-TS/effect/pull/1562) [`0effd559e`](https://github.com/Effect-TS/effect/commit/0effd559e510a435eae98b201226515dfbc5fc2e) Thanks [@tim-smart](https://github.com/tim-smart)! - rename RequestResolver.fromFunctionEffect to fromEffect

- [#1564](https://github.com/Effect-TS/effect/pull/1564) [`0eb0605b8`](https://github.com/Effect-TS/effect/commit/0eb0605b89a095242093539e70cc91976e541f83) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate state by version and check for version correctness

### Patch Changes

- [#1586](https://github.com/Effect-TS/effect/pull/1586) [`3ed4997c6`](https://github.com/Effect-TS/effect/commit/3ed4997c667f462371f26f650ac51fe533e3c044) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - Fix List.map implementation of the index parameter and removed the index parameter from List.flatMapNonEmpty

- [#1593](https://github.com/Effect-TS/effect/pull/1593) [`92f7316a2`](https://github.com/Effect-TS/effect/commit/92f7316a2f847582146c77b2b83bf65046bf0231) Thanks [@tim-smart](https://github.com/tim-smart)! - fix timeOrigin polyfill in clock

- [#1568](https://github.com/Effect-TS/effect/pull/1568) [`a51fb6d80`](https://github.com/Effect-TS/effect/commit/a51fb6d80d22c912157b862432ee0ca5e0d14caa) Thanks [@tim-smart](https://github.com/tim-smart)! - add Stream.accumulate

- [#1592](https://github.com/Effect-TS/effect/pull/1592) [`57d8f1792`](https://github.com/Effect-TS/effect/commit/57d8f17924e91e10617753382a91a3136043b421) Thanks [@gcanti](https://github.com/gcanti)! - Predicate: add hasProperty (+ internal refactoring to leverage it)

- [#1562](https://github.com/Effect-TS/effect/pull/1562) [`0effd559e`](https://github.com/Effect-TS/effect/commit/0effd559e510a435eae98b201226515dfbc5fc2e) Thanks [@tim-smart](https://github.com/tim-smart)! - add RequestResolver.fromEffectTagged

- [#1588](https://github.com/Effect-TS/effect/pull/1588) [`7c9d15c25`](https://github.com/Effect-TS/effect/commit/7c9d15c25f23f79ab4e7777a3b656119234586f9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix fiber failure stack

- [#1568](https://github.com/Effect-TS/effect/pull/1568) [`a51fb6d80`](https://github.com/Effect-TS/effect/commit/a51fb6d80d22c912157b862432ee0ca5e0d14caa) Thanks [@tim-smart](https://github.com/tim-smart)! - add Stream.accumulateChunks

- [#1585](https://github.com/Effect-TS/effect/pull/1585) [`e0ef64102`](https://github.com/Effect-TS/effect/commit/e0ef64102b05c874e844f680f53746821609e1b6) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: getEquivalence, resolve index out-of-bounds error when comparing chunks of different lengths

## 2.0.0-next.52

### Patch Changes

- [#1565](https://github.com/Effect-TS/effect/pull/1565) [`98de6fe6e`](https://github.com/Effect-TS/effect/commit/98de6fe6e0cb89750cbc4ca795a880c56488a1e8) Thanks [@tim-smart](https://github.com/tim-smart)! - fix support for optional props in Data classes

## 2.0.0-next.51

### Minor Changes

- [#1560](https://github.com/Effect-TS/effect/pull/1560) [`1395dc58c`](https://github.com/Effect-TS/effect/commit/1395dc58c9d1b384d22411722eff7aeeec129d36) Thanks [@tim-smart](https://github.com/tim-smart)! - use Proxy for TaggedEnum constructors

### Patch Changes

- [#1555](https://github.com/Effect-TS/effect/pull/1555) [`62140675c`](https://github.com/Effect-TS/effect/commit/62140675cd0b36d203b1d8fa94ea9f1732881488) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray / List / Chunk: merge mapNonEmpty with map

- [#1559](https://github.com/Effect-TS/effect/pull/1559) [`6114c3893`](https://github.com/Effect-TS/effect/commit/6114c38936d650238172f09358e82a4af21200cb) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid relying on captureStackTrace for Data.Error

- [#1528](https://github.com/Effect-TS/effect/pull/1528) [`b45b7e452`](https://github.com/Effect-TS/effect/commit/b45b7e452681dfece0db4a85265c56cef149d721) Thanks [@fubhy](https://github.com/fubhy)! - Added BigDecimal module

- [#1554](https://github.com/Effect-TS/effect/pull/1554) [`fe7d7c28b`](https://github.com/Effect-TS/effect/commit/fe7d7c28bb6cdbffe8af5b927e95eea8fec2d4d6) Thanks [@sukovanej](https://github.com/sukovanej)! - Fix `Struct.omit` and `Struct.pick` return types.

- [#1547](https://github.com/Effect-TS/effect/pull/1547) [`c0569f8fe`](https://github.com/Effect-TS/effect/commit/c0569f8fe91707c2088adebd86562ec455a62bab) Thanks [@gcanti](https://github.com/gcanti)! - Data: improve DX (displayed types)

  Previously, the displayed types of data used the Omit type to exclude certain fields.
  This commit removes the use of Omit from the displayed types of data. This makes the types simpler and easier to understand.
  It also enforces all fields as readonly.

- [#1549](https://github.com/Effect-TS/effect/pull/1549) [`f82208687`](https://github.com/Effect-TS/effect/commit/f82208687e04fe191f8c18a56ceb10eb61376152) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix missing globalValue in Logger and Query

- [#1557](https://github.com/Effect-TS/effect/pull/1557) [`15013f707`](https://github.com/Effect-TS/effect/commit/15013f7078358ccaf10f9a89b1d36df14b758a88) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Allow optional parameters to be used in TaggedEnum

## 2.0.0-next.50

### Minor Changes

- [#1526](https://github.com/Effect-TS/effect/pull/1526) [`656955944`](https://github.com/Effect-TS/effect/commit/6569559440e8304c596edaaa21bcae4c8dba2568) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: remove useless alias toArray

- [#1539](https://github.com/Effect-TS/effect/pull/1539) [`9c7dea219`](https://github.com/Effect-TS/effect/commit/9c7dea219ded2cb86a2a33d6ab98a629a891e365) Thanks [@tim-smart](https://github.com/tim-smart)! - remove sampled from span options

- [#1530](https://github.com/Effect-TS/effect/pull/1530) [`7c3a6d59d`](https://github.com/Effect-TS/effect/commit/7c3a6d59de642a3691dff525bca981e5f6c05cd1) Thanks [@fubhy](https://github.com/fubhy)! - Change `divide` return type to `Option` and added a `unsafeDivide` operation that throws in case the divisor is `0`

- [#1535](https://github.com/Effect-TS/effect/pull/1535) [`fd296a6d5`](https://github.com/Effect-TS/effect/commit/fd296a6d5206b1e4c072bad675f2f6a70b60a7f8) Thanks [@tim-smart](https://github.com/tim-smart)! - use context for tracer spans

- [#1534](https://github.com/Effect-TS/effect/pull/1534) [`fb26bb770`](https://github.com/Effect-TS/effect/commit/fb26bb7707e7599a70892f06e485065e331b63e3) Thanks [@fubhy](https://github.com/fubhy)! - Removed optional math variants

### Patch Changes

- [#1537](https://github.com/Effect-TS/effect/pull/1537) [`9bd70154b`](https://github.com/Effect-TS/effect/commit/9bd70154b62c2f101b85a8d509e480d5281abe4b) Thanks [@patroza](https://github.com/patroza)! - fix: Either/Option gen when no yield executes, just a plain return

- [#1526](https://github.com/Effect-TS/effect/pull/1526) [`656955944`](https://github.com/Effect-TS/effect/commit/6569559440e8304c596edaaa21bcae4c8dba2568) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: add missing APIs:

  - keys
  - values
  - upsert
  - update
  - isSubrecord
  - isSubrecordBy
  - reduce
  - every
  - some
  - union
  - intersection
  - difference
  - getEquivalence
  - singleton

- [#1536](https://github.com/Effect-TS/effect/pull/1536) [`80800bfb0`](https://github.com/Effect-TS/effect/commit/80800bfb044585c836b8af585946881f2160ebb1) Thanks [@fubhy](https://github.com/fubhy)! - avoid use of bigint literals

## 2.0.0-next.49

### Patch Changes

- [#1517](https://github.com/Effect-TS/effect/pull/1517) [`685a645b9`](https://github.com/Effect-TS/effect/commit/685a645b940f7785d8c1020eeaff1591bbb19535) Thanks [@tim-smart](https://github.com/tim-smart)! - fix off-by-one bug in Stream.fromIterable

- [#1489](https://github.com/Effect-TS/effect/pull/1489) [`c2a11978f`](https://github.com/Effect-TS/effect/commit/c2a11978f9e3e7ce9df89715770a0fee564e1422) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - Add `Chunk.mapNonEmpty`

- [#1516](https://github.com/Effect-TS/effect/pull/1516) [`ccbb23ba3`](https://github.com/Effect-TS/effect/commit/ccbb23ba3b52d6920f77d69809f46cd172be98cb) Thanks [@tim-smart](https://github.com/tim-smart)! - export Channel.suspend

- [#1511](https://github.com/Effect-TS/effect/pull/1511) [`35ecb915a`](https://github.com/Effect-TS/effect/commit/35ecb915a56ff46580747f66cf69fb1b7c0c0061) Thanks [@tim-smart](https://github.com/tim-smart)! - improve Cause toJSON output

- [#1489](https://github.com/Effect-TS/effect/pull/1489) [`c2a11978f`](https://github.com/Effect-TS/effect/commit/c2a11978f9e3e7ce9df89715770a0fee564e1422) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - Add `List.mapNonEmpty`

- [#1519](https://github.com/Effect-TS/effect/pull/1519) [`43fdc45bf`](https://github.com/Effect-TS/effect/commit/43fdc45bfd9e81797b64e62af98fc9adc629151f) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add Key, Value type-level helpers

- [#1525](https://github.com/Effect-TS/effect/pull/1525) [`f710599df`](https://github.com/Effect-TS/effect/commit/f710599df73d10b9b73bb1890fadd300f52829de) Thanks [@ahrjarrett](https://github.com/ahrjarrett)! - removes unnecessary type parameter from TaggedEnum

- [#1521](https://github.com/Effect-TS/effect/pull/1521) [`2db755525`](https://github.com/Effect-TS/effect/commit/2db7555256e6bfd4420cb71251c386c355ded40f) Thanks [@ahrjarrett](https://github.com/ahrjarrett)! - enforce that members passed to TaggedEnum do not have a `_tag` property themselves

- [#1529](https://github.com/Effect-TS/effect/pull/1529) [`df512220e`](https://github.com/Effect-TS/effect/commit/df512220ee21876621d6c966f1732477b4eac796) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Channel.mergeAllWith unbounded concurrency

## 2.0.0-next.48

### Minor Changes

- [#1484](https://github.com/Effect-TS/effect/pull/1484) [`4cdc1ebc6`](https://github.com/Effect-TS/effect/commit/4cdc1ebc6072db7e0038473b96c596759bff7601) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `Bigint` to `BigInt`

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - Allow log annotations to be any object.

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - move Effect.set\* Layer apis to the Layer module

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - add sampled flag to spans

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor Effect span apis

### Patch Changes

- [#1504](https://github.com/Effect-TS/effect/pull/1504) [`f186416b9`](https://github.com/Effect-TS/effect/commit/f186416b9108a409eae23870129b1261ef2cc41c) Thanks [@kutyel](https://github.com/kutyel)! - feat: add `ap` method to `Effect`, `ap` and `zipWith` to `Either` ⚡️

- [#1507](https://github.com/Effect-TS/effect/pull/1507) [`2397b5548`](https://github.com/Effect-TS/effect/commit/2397b5548b957b32acdb5baf091295babe5b36e9) Thanks [@tim-smart](https://github.com/tim-smart)! - allow message property on Data YieldableError

- [#1501](https://github.com/Effect-TS/effect/pull/1501) [`4ca2abd06`](https://github.com/Effect-TS/effect/commit/4ca2abd06ee5e7c51abf77b094adab871693bdd5) Thanks [@tim-smart](https://github.com/tim-smart)! - add Match module

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - allow tracing attributes to be unknown

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - add onEnd finalizer to Layer span apis

- [#1503](https://github.com/Effect-TS/effect/pull/1503) [`6a928e49f`](https://github.com/Effect-TS/effect/commit/6a928e49f18355fdd6e82dc1b9f40f29c7aab639) Thanks [@VenomAV](https://github.com/VenomAV)! - Fix Stream.groupAdjacentBy when group spans multiple chunks

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - add Tracer.externalSpan constructor

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.withParentSpan api

- [#1507](https://github.com/Effect-TS/effect/pull/1507) [`2397b5548`](https://github.com/Effect-TS/effect/commit/2397b5548b957b32acdb5baf091295babe5b36e9) Thanks [@tim-smart](https://github.com/tim-smart)! - add name getter to YieldableError

## 2.0.0-next.47

### Minor Changes

- [#1495](https://github.com/Effect-TS/effect/pull/1495) [`01c479f0c`](https://github.com/Effect-TS/effect/commit/01c479f0c86d99344c0a5625bdc2c5564915d512) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support rendezvous-like behaviour in Queue.bounded

## 2.0.0-next.46

### Minor Changes

- [#1483](https://github.com/Effect-TS/effect/pull/1483) [`e68453bf4`](https://github.com/Effect-TS/effect/commit/e68453bf457f32502e5cd47273c298fb24f2feb0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Include stack in Data.Error/Data.TaggedError

- [#1483](https://github.com/Effect-TS/effect/pull/1483) [`e68453bf4`](https://github.com/Effect-TS/effect/commit/e68453bf457f32502e5cd47273c298fb24f2feb0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Include Error module in Data

### Patch Changes

- [#1487](https://github.com/Effect-TS/effect/pull/1487) [`bd1748406`](https://github.com/Effect-TS/effect/commit/bd17484068436d0b605c179e47ad63cdbdfb39b0) Thanks [@fubhy](https://github.com/fubhy)! - Added bigint math functions for `abs`, `sqrt`, `lcm` and `gcd`

- [#1491](https://github.com/Effect-TS/effect/pull/1491) [`6ff77385c`](https://github.com/Effect-TS/effect/commit/6ff77385c43e049fc864719574ced3691969c3f8) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Layer.withSpan optional args

- [#1492](https://github.com/Effect-TS/effect/pull/1492) [`471b5172b`](https://github.com/Effect-TS/effect/commit/471b5172bda5d29c4104414b4017f36a45b431c7) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure more failures are annotated with spans

## 2.0.0-next.45

### Patch Changes

- [#1465](https://github.com/Effect-TS/effect/pull/1465) [`10a8fb9fe`](https://github.com/Effect-TS/effect/commit/10a8fb9fe513b219e678da71ebe80ce7ce61dd68) Thanks [@tim-smart](https://github.com/tim-smart)! - add incremental only counters

- [#1472](https://github.com/Effect-TS/effect/pull/1472) [`1c56aa9c1`](https://github.com/Effect-TS/effect/commit/1c56aa9c1b267faea5f48e0f126cac579c30ae24) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to build-utils prepare-v1

- [#1480](https://github.com/Effect-TS/effect/pull/1480) [`c31de5410`](https://github.com/Effect-TS/effect/commit/c31de54105a42a7d27f5db797f1993b463fd7b66) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor Effectable and Streamable public api

- [#1463](https://github.com/Effect-TS/effect/pull/1463) [`8932e9b26`](https://github.com/Effect-TS/effect/commit/8932e9b264f85233069407e884b951bc87c159d4) Thanks [@gcanti](https://github.com/gcanti)! - Rename Hub to PubSub, closes #1462

- [#1455](https://github.com/Effect-TS/effect/pull/1455) [`c3e99ce56`](https://github.com/Effect-TS/effect/commit/c3e99ce5677ba0092e598624f7234d489f48e131) Thanks [@TylorS](https://github.com/TylorS)! - add Streamable for creating custom Streams

- [#1465](https://github.com/Effect-TS/effect/pull/1465) [`10a8fb9fe`](https://github.com/Effect-TS/effect/commit/10a8fb9fe513b219e678da71ebe80ce7ce61dd68) Thanks [@tim-smart](https://github.com/tim-smart)! - add bigint counter & gauge metrics

- [#1473](https://github.com/Effect-TS/effect/pull/1473) [`6c967c9bc`](https://github.com/Effect-TS/effect/commit/6c967c9bc7c6279af201ea205432d62b2a1764be) Thanks [@tim-smart](https://github.com/tim-smart)! - support records in Effect.tagMetrics

- [#1480](https://github.com/Effect-TS/effect/pull/1480) [`c31de5410`](https://github.com/Effect-TS/effect/commit/c31de54105a42a7d27f5db797f1993b463fd7b66) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Effect prototype objects in Effectable module

## 2.0.0-next.44

### Patch Changes

- [#1469](https://github.com/Effect-TS/effect/pull/1469) [`5a217ac18`](https://github.com/Effect-TS/effect/commit/5a217ac1842252636d4e529baa191ea0778e42ce) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix yield loop

## 2.0.0-next.43

### Patch Changes

- [#1467](https://github.com/Effect-TS/effect/pull/1467) [`7e258a9c1`](https://github.com/Effect-TS/effect/commit/7e258a9c1fabeeb9319cb50655a0221bd1e38ac8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Attempt at resolving TS issue with module discovery

## 2.0.0-next.42

### Patch Changes

- [#1466](https://github.com/Effect-TS/effect/pull/1466) [`31c4068fe`](https://github.com/Effect-TS/effect/commit/31c4068fe830797162c554a57ec3e6cec8c4a834) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all fiber refs are wrapped with globalValue

- [#1459](https://github.com/Effect-TS/effect/pull/1459) [`e8fb7f73b`](https://github.com/Effect-TS/effect/commit/e8fb7f73bd3cbdb663585de1d8d3b196a9cbec98) Thanks [@fubhy](https://github.com/fubhy)! - Fix binding issue in timeout module

- [#1466](https://github.com/Effect-TS/effect/pull/1466) [`31c4068fe`](https://github.com/Effect-TS/effect/commit/31c4068fe830797162c554a57ec3e6cec8c4a834) Thanks [@tim-smart](https://github.com/tim-smart)! - fix comparisons by reference

- [#1461](https://github.com/Effect-TS/effect/pull/1461) [`90210ba28`](https://github.com/Effect-TS/effect/commit/90210ba28a6b078087a4d4c7b26b1b578e920476) Thanks [@gcanti](https://github.com/gcanti)! - Error: rename Tagged to TaggedClass (to align with the naming convention in the Data module)

## 2.0.0-next.41

### Patch Changes

- [#1456](https://github.com/Effect-TS/effect/pull/1456) [`4bc30e5ff`](https://github.com/Effect-TS/effect/commit/4bc30e5ff0db46f7920cedeb9254bb09c50a5875) Thanks [@tim-smart](https://github.com/tim-smart)! - re-add types field to exports in package.json

## 2.0.0-next.40

### Patch Changes

- [#1454](https://github.com/Effect-TS/effect/pull/1454) [`0a9afd299`](https://github.com/Effect-TS/effect/commit/0a9afd299aeb265f09d46f203294db5d970cf903) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.withSpan

- [#1451](https://github.com/Effect-TS/effect/pull/1451) [`44ea13d9c`](https://github.com/Effect-TS/effect/commit/44ea13d9c7dc57b94b1fe73984b0a62a05994cfe) Thanks [@fubhy](https://github.com/fubhy)! - Move types export condition to the top

## 2.0.0-next.39

### Patch Changes

- [#1446](https://github.com/Effect-TS/effect/pull/1446) [`3f6f23149`](https://github.com/Effect-TS/effect/commit/3f6f23149d50ac63b94bbf452353156899750f7c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add sideEffects to package json

- [#1445](https://github.com/Effect-TS/effect/pull/1445) [`52626a538`](https://github.com/Effect-TS/effect/commit/52626a538693be17667d9f5d28b632215d0e714f) Thanks [@gcanti](https://github.com/gcanti)! - Duration: add toSeconds

- [#1450](https://github.com/Effect-TS/effect/pull/1450) [`713337c7c`](https://github.com/Effect-TS/effect/commit/713337c7c8eb55e50dcfe538c40dace280aee3f8) Thanks [@fubhy](https://github.com/fubhy)! - Hotfix type condition in package.json exports

- [#1449](https://github.com/Effect-TS/effect/pull/1449) [`8f74d671d`](https://github.com/Effect-TS/effect/commit/8f74d671db4018156831e8305876360ec7d1ee3f) Thanks [@tim-smart](https://github.com/tim-smart)! - add preserveModules patch for preconstruct

## 2.0.0-next.38

### Patch Changes

- [#1442](https://github.com/Effect-TS/effect/pull/1442) [`c5e4a2390`](https://github.com/Effect-TS/effect/commit/c5e4a2390168b335307004a6e5623e53bd22734e) Thanks [@tim-smart](https://github.com/tim-smart)! - add top level exports from Function

## 2.0.0-next.37

### Minor Changes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch on \_op to allow for yieldable tagged errors

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Unify ecosystem packages

### Patch Changes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add Error module for creating error classes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add Effectable module for creating custom Effect's

## 2.0.0-next.36

### Patch Changes

- [#1436](https://github.com/Effect-TS/effect/pull/1436) [`f7cb1b8be`](https://github.com/Effect-TS/effect/commit/f7cb1b8be7dd961cbe7def7210bfac876c7f95db) Thanks [@fubhy](https://github.com/fubhy)! - update dependencies

## 2.0.0-next.35

### Patch Changes

- [#1435](https://github.com/Effect-TS/effect/pull/1435) [`f197821b7`](https://github.com/Effect-TS/effect/commit/f197821b7faa3796a861f4c2d14ce6605ba12234) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#1432](https://github.com/Effect-TS/effect/pull/1432) [`b8b11c5a5`](https://github.com/Effect-TS/effect/commit/b8b11c5a5aee53e880d6f205fc19027b771966f0) Thanks [@gcanti](https://github.com/gcanti)! - move FiberRefsPatch from FiberRefs module to its own module

## 2.0.0-next.34

### Patch Changes

- [#1428](https://github.com/Effect-TS/effect/pull/1428) [`d77e66834`](https://github.com/Effect-TS/effect/commit/d77e668346db402374e9a28a5f00840e75679387) Thanks [@gcanti](https://github.com/gcanti)! - expose /stm THub module

## 2.0.0-next.33

### Patch Changes

- [#1426](https://github.com/Effect-TS/effect/pull/1426) [`92af22066`](https://github.com/Effect-TS/effect/commit/92af220665261946a440b62e283e3772e4c5fa72) Thanks [@tim-smart](https://github.com/tim-smart)! - expose /data GlobalValue & Types modules

## 2.0.0-next.32

### Patch Changes

- [#1422](https://github.com/Effect-TS/effect/pull/1422) [`89759cc0c`](https://github.com/Effect-TS/effect/commit/89759cc0c934248ae3ecb0c394f5b1e0917b423f) Thanks [@gcanti](https://github.com/gcanti)! - update dependencies

## 2.0.0-next.31

### Patch Changes

- [#1419](https://github.com/Effect-TS/effect/pull/1419) [`543dfb495`](https://github.com/Effect-TS/effect/commit/543dfb495c7cfd4799b27e0623d547cf0341a838) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 2.0.0-next.30

### Patch Changes

- [#1416](https://github.com/Effect-TS/effect/pull/1416) [`f464fb494`](https://github.com/Effect-TS/effect/commit/f464fb4948aec38621ca20d824d542980bc250f5) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 2.0.0-next.29

### Patch Changes

- [#1412](https://github.com/Effect-TS/effect/pull/1412) [`93f4c9f9a`](https://github.com/Effect-TS/effect/commit/93f4c9f9ab1da2bfe37a439383bb14d861441ea4) Thanks [@tim-smart](https://github.com/tim-smart)! - update peer deps

## 2.0.0-next.28

### Patch Changes

- [#1410](https://github.com/Effect-TS/effect/pull/1410) [`a8ffb5fb9`](https://github.com/Effect-TS/effect/commit/a8ffb5fb9a4a4decc44dce811356136542813af0) Thanks [@tim-smart](https://github.com/tim-smart)! - update @effect/match

## 2.0.0-next.27

### Patch Changes

- [#1408](https://github.com/Effect-TS/effect/pull/1408) [`a6b9f4f01`](https://github.com/Effect-TS/effect/commit/a6b9f4f01892c3cdc6ce56fa3a47c051b0064629) Thanks [@tim-smart](https://github.com/tim-smart)! - update /match

## 2.0.0-next.26

### Patch Changes

- [#1404](https://github.com/Effect-TS/effect/pull/1404) [`6441df29e`](https://github.com/Effect-TS/effect/commit/6441df29ede8a8d33398fff4ae44d141741c64f9) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Console module

## 2.0.0-next.25

### Patch Changes

- [#1402](https://github.com/Effect-TS/effect/pull/1402) [`0844367c5`](https://github.com/Effect-TS/effect/commit/0844367c546184dd9105a3394fc019ed9ad0199e) Thanks [@tim-smart](https://github.com/tim-smart)! - use dependencies + peerDependencies for packages

## 2.0.0-next.24

### Minor Changes

- [#1395](https://github.com/Effect-TS/effect/pull/1395) [`aecaeb88c`](https://github.com/Effect-TS/effect/commit/aecaeb88c5cc58da18e0291cdefdf3a30a14a759) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#1395](https://github.com/Effect-TS/effect/pull/1395) [`aecaeb88c`](https://github.com/Effect-TS/effect/commit/aecaeb88c5cc58da18e0291cdefdf3a30a14a759) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to using peerDependencies

- [#1397](https://github.com/Effect-TS/effect/pull/1397) [`9ffd45ba7`](https://github.com/Effect-TS/effect/commit/9ffd45ba78b989d704b0d23691a7afdd758a8674) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to @effect/build-utils and @effect/eslint-plugin

## 2.0.0-next.23

### Patch Changes

- [#1393](https://github.com/Effect-TS/effect/pull/1393) [`db1f1e677`](https://github.com/Effect-TS/effect/commit/db1f1e677570045126c15b0a5158866f2233363a) Thanks [@tim-smart](https://github.com/tim-smart)! - update packages

## 2.0.0-next.22

### Patch Changes

- [#1389](https://github.com/Effect-TS/effect/pull/1389) [`02703a5c7`](https://github.com/Effect-TS/effect/commit/02703a5c7959692d61dbea734bb84b4e4b48c10e) Thanks [@tim-smart](https://github.com/tim-smart)! - update packages

## 2.0.0-next.21

### Patch Changes

- [#1387](https://github.com/Effect-TS/effect/pull/1387) [`83401b13a`](https://github.com/Effect-TS/effect/commit/83401b13a98b4b961a3257d21feef0b5978cbf7e) Thanks [@tim-smart](https://github.com/tim-smart)! - update /stream

## 2.0.0-next.20

### Patch Changes

- [#1385](https://github.com/Effect-TS/effect/pull/1385) [`a53697e15`](https://github.com/Effect-TS/effect/commit/a53697e1532f330d1a653332ec3fd1d74188efbf) Thanks [@tim-smart](https://github.com/tim-smart)! - add /stm, /stream and /match

## 2.0.0-next.19

### Minor Changes

- [#1383](https://github.com/Effect-TS/effect/pull/1383) [`d9c229a87`](https://github.com/Effect-TS/effect/commit/d9c229a87133847b596f3ed2871904bb8ad90fb2) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 2.0.0-next.18

### Patch Changes

- [#1381](https://github.com/Effect-TS/effect/pull/1381) [`bf5ebae41`](https://github.com/Effect-TS/effect/commit/bf5ebae41d4851bf2cd6228c6244ac268c20c92f) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 2.0.0-next.17

### Patch Changes

- [#1379](https://github.com/Effect-TS/effect/pull/1379) [`2e9b54d03`](https://github.com/Effect-TS/effect/commit/2e9b54d0393c3f3c7e63ba2d6507d36074be0b51) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 2.0.0-next.16

### Patch Changes

- [#1376](https://github.com/Effect-TS/effect/pull/1376) [`f356fa23d`](https://github.com/Effect-TS/effect/commit/f356fa23d8dc075781432ce336ea0ed748cf8131) Thanks [@gcanti](https://github.com/gcanti)! - add Config/\* modules

## 2.0.0-next.15

### Patch Changes

- [#1374](https://github.com/Effect-TS/effect/pull/1374) [`37cb95bfd`](https://github.com/Effect-TS/effect/commit/37cb95bfd33bda273d30f62b3176bf410684ae96) Thanks [@gcanti](https://github.com/gcanti)! - remove fast-check from deps

## 2.0.0-next.14

### Patch Changes

- [#1372](https://github.com/Effect-TS/effect/pull/1372) [`1322363d5`](https://github.com/Effect-TS/effect/commit/1322363d59ddca50b72758da47a1ef8b48a53bcc) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest versions

## 2.0.0-next.13

### Patch Changes

- [#1360](https://github.com/Effect-TS/effect/pull/1360) [`fef698b15`](https://github.com/Effect-TS/effect/commit/fef698b151dba7a4f9598a452cf6acbd1bee7567) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Elect selected modules to main export

## 2.0.0-next.12

### Patch Changes

- [#1358](https://github.com/Effect-TS/effect/pull/1358) [`54152d7af`](https://github.com/Effect-TS/effect/commit/54152d7af3cf188b4e550d2e1879c0fe18ea2de7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Restructure package

## 2.0.0-next.11

### Patch Changes

- [#1356](https://github.com/Effect-TS/effect/pull/1356) [`9fcc559d2`](https://github.com/Effect-TS/effect/commit/9fcc559d2206fed5eeb44dd604d7cb3ed7c8465c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update release

## 2.0.0-next.10

### Patch Changes

- [#1353](https://github.com/Effect-TS/effect/pull/1353) [`6285a7712`](https://github.com/Effect-TS/effect/commit/6285a7712b0fd630f5031fec360eb42a68d9b788) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.9

### Patch Changes

- [#1352](https://github.com/Effect-TS/effect/pull/1352) [`5220362c9`](https://github.com/Effect-TS/effect/commit/5220362c993fcd655229d90fdaf2a740c216b189) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

- [#1350](https://github.com/Effect-TS/effect/pull/1350) [`b18068ebe`](https://github.com/Effect-TS/effect/commit/b18068ebe8ba1c1ceebbd0ec088bd3587c318b29) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io and remove LogLevel isolation

## 2.0.0-next.8

### Patch Changes

- [#1348](https://github.com/Effect-TS/effect/pull/1348) [`a789742bd`](https://github.com/Effect-TS/effect/commit/a789742bd5ef48e3023f3e47499ee11e9874501e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate LogLevel export

## 2.0.0-next.7

### Patch Changes

- [#1346](https://github.com/Effect-TS/effect/pull/1346) [`2d6cdbc2a`](https://github.com/Effect-TS/effect/commit/2d6cdbc2a842b25e56136735953e32f851094d74) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Logger extensions

## 2.0.0-next.6

### Patch Changes

- [#1344](https://github.com/Effect-TS/effect/pull/1344) [`aa550d9f9`](https://github.com/Effect-TS/effect/commit/aa550d9f9eb743ce4f6f1d7902374855b57cffe8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.5

### Patch Changes

- [#1342](https://github.com/Effect-TS/effect/pull/1342) [`2c8c14f7c`](https://github.com/Effect-TS/effect/commit/2c8c14f7c9a6ca03ed38f52e9a78774403cbf8bd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.4

### Patch Changes

- [#1339](https://github.com/Effect-TS/effect/pull/1339) [`aabfb1d0f`](https://github.com/Effect-TS/effect/commit/aabfb1d0fc348ad70c83706fae8c84d8cd81017f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

- [#1341](https://github.com/Effect-TS/effect/pull/1341) [`a2b0eca61`](https://github.com/Effect-TS/effect/commit/a2b0eca6118d895746bc178e83dfe8cba0ef5edb) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Optic Re-Export

## 2.0.0-next.3

### Patch Changes

- [#1337](https://github.com/Effect-TS/effect/pull/1337) [`4f805f5c1`](https://github.com/Effect-TS/effect/commit/4f805f5c1f7306c8af144a9a5d888121c0a1488d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update docs

## 2.0.0-next.2

### Patch Changes

- [#1333](https://github.com/Effect-TS/effect/pull/1333) [`b3dac7e1b`](https://github.com/Effect-TS/effect/commit/b3dac7e1be152b0882340bc57866bc8ce0a3eb47) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update repo in package.json

- [#1335](https://github.com/Effect-TS/effect/pull/1335) [`3c7d4f2e4`](https://github.com/Effect-TS/effect/commit/3c7d4f2e440f2076b02f0dc985f598808b54b358) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update docs

## 2.0.0-next.1

### Patch Changes

- [#1330](https://github.com/Effect-TS/core/pull/1330) [`75780dea1`](https://github.com/Effect-TS/core/commit/75780dea16555c8eef8053d3cd167a60cdd2e1d9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 2.0.0-next.0

### Major Changes

- [#1321](https://github.com/Effect-TS/core/pull/1321) [`315a3ab42`](https://github.com/Effect-TS/core/commit/315a3ab42e626ef31fd0336214416cad86131654) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Bootstrap Ecosystem Package

### Patch Changes

- [#1329](https://github.com/Effect-TS/core/pull/1329) [`b015fdac5`](https://github.com/Effect-TS/core/commit/b015fdac5d9db44bae189e216a8d68b6739d8015) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update to @effect/io@0.0.9

- [#1324](https://github.com/Effect-TS/core/pull/1324) [`74fa4086e`](https://github.com/Effect-TS/core/commit/74fa4086e5b26c5f20706a3209e6c8345e187bcc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate Debug

- [#1326](https://github.com/Effect-TS/core/pull/1326) [`edc131f65`](https://github.com/Effect-TS/core/commit/edc131f65d71b751f4f2dd4b46acd1fbef5f9804) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Remaining Effect Re-Exports

- [#1323](https://github.com/Effect-TS/core/pull/1323) [`7f57f59de`](https://github.com/Effect-TS/core/commit/7f57f59deabfe6d2c06afd56ffc79bb22758290b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fp-ts/data re-exports

- [#1325](https://github.com/Effect-TS/core/pull/1325) [`52dacbf72`](https://github.com/Effect-TS/core/commit/52dacbf7252f0bfcbd9ed01b93bc0b26f0440da4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fp-ts/core Re-Exports
