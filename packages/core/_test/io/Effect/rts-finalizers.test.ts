import {
  asyncExampleError,
  asyncUnit,
  ExampleError,
  ExampleErrorFail
} from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS finalizers", () => {
    it("fail ensuring", () =>
      Do(($) => {
        let finalized = false
        const result = $(
          Effect.failSync(ExampleError).ensuring(
            Effect.sync(() => {
              finalized = true
            })
          ).exit
        )
        assert.isTrue(result == Exit.fail(ExampleError))
        assert.isTrue(finalized)
      }).unsafeRunPromiseExit())

    it("fail on error", () =>
      Do(($) => {
        let finalized = false
        const result = $(
          Effect.failSync(ExampleError).onError(() =>
            Effect.sync(() => {
              finalized = true
            })
          ).exit
        )
        assert.isTrue(result == Exit.fail(ExampleError))
        assert.isTrue(finalized)
      }).unsafeRunPromiseExit())

    it("finalizer errors not caught", () =>
      Do(($) => {
        const e2 = new Error("e2")
        const e3 = new Error("e3")
        const result = $(
          ExampleErrorFail.ensuring(Effect.dieSync(e2))
            .ensuring(Effect.dieSync(e3))
            .sandbox
            .flip
            .map((cause) => cause)
        )
        const expected = Cause.fail(ExampleError) + Cause.die(e2) + Cause.die(e3)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("finalizer errors reported", () =>
      Do(($) => {
        let reported: Exit<never, number> | undefined
        const result = $(
          Effect.sync(42).ensuring(Effect.dieSync(ExampleError)).fork.flatMap((fiber) =>
            fiber.await.flatMap((e) =>
              Effect.sync(() => {
                reported = e
              })
            )
          )
        )
        assert.isUndefined(result)
        assert.isFalse(reported && reported.isSuccess())
      }).unsafeRunPromise())

    it("acquireUseRelease exit() is usage result", () =>
      Do(($) => {
        const result = $(Effect.acquireUseRelease(
          Effect.unit,
          () => Effect.sync(42),
          () => Effect.unit
        ))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("error in just acquisition", () =>
      Do(($) => {
        const result = $(
          Effect.acquireUseRelease(
            ExampleErrorFail,
            () => Effect.unit,
            () => Effect.unit
          ).exit
        )
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())

    it("error in just release", () =>
      Do(($) => {
        const result = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => Effect.unit,
            () => Effect.dieSync(ExampleError)
          ).exit
        )
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromiseExit())

    it("error in just usage", () =>
      Do(($) => {
        const result = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => Effect.failSync(ExampleError),
            () => Effect.unit
          ).exit
        )
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())

    it("rethrown caught error in acquisition", () =>
      Do(($) => {
        const result = $(
          Effect.absolve(
            Effect.acquireUseRelease(
              ExampleErrorFail,
              () => Effect.unit,
              () => Effect.unit
            ).either
          ).flip
        )
        assert.deepEqual(result, ExampleError)
      }).unsafeRunPromise())

    it("rethrown caught error in release", () =>
      Do(($) => {
        const result = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => Effect.unit,
            () => Effect.dieSync(ExampleError)
          ).exit
        )
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromiseExit())

    it("rethrown caught error in usage", () =>
      Do(($) => {
        const result = $(
          Effect.absolve(
            Effect.acquireUseReleaseDiscard(
              Effect.unit,
              ExampleErrorFail,
              Effect.unit
            ).either
          ).exit
        )
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())

    it("test eval of async fail", () =>
      Do(($) => {
        const io1 = Effect.acquireUseReleaseDiscard(
          Effect.unit,
          asyncExampleError<void>(),
          asyncUnit<never>()
        )
        const io2 = Effect.acquireUseReleaseDiscard(
          asyncUnit<never>(),
          asyncExampleError<void>(),
          asyncUnit<never>()
        )
        const a1 = $(io1.exit)
        const a2 = $(io2.exit)
        const a3 = $(Effect.absolve(io1.either).exit)
        const a4 = $(Effect.absolve(io2.either).exit)
        assert.isTrue(a1 == Exit.fail(ExampleError))
        assert.isTrue(a2 == Exit.fail(ExampleError))
        assert.isTrue(a3 == Exit.fail(ExampleError))
        assert.isTrue(a4 == Exit.fail(ExampleError))
      }).unsafeRunPromise())

    it("acquireReleaseWith regression 1", () =>
      Do(($) => {
        function makeLogger(ref: Ref<List<string>>) {
          return (line: string): Effect<never, never, void> =>
            ref.update((list) => list.concat(List(line)))
        }
        const ref = $(Ref.make(List.empty<string>()))
        const log = makeLogger(ref)
        const fiber = $(
          Effect.acquireUseRelease(
            Effect.acquireUseRelease(
              Effect.unit,
              () => Effect.unit,
              () => log("start 1").zipRight(Effect.sleep((10).millis)).zipRight(log("release 1"))
            ),
            () => Effect.unit,
            () => log("start 2").zipRight(Effect.sleep((10).millis)).zipRight(log("release 2"))
          ).fork
        )
        $(
          ref.get.zipLeft(Effect.sleep((1).millis)).repeatUntil((list) =>
            list.find((s) => s === "start 1").isSome()
          )
        )
        $(fiber.interrupt)
        $(
          ref.get.zipLeft(Effect.sleep((1).millis)).repeatUntil((list) =>
            list.find((s) => s === "release 2").isSome()
          )
        )
        const result = $(ref.get)
        assert.isTrue(result.find((s) => s === "start 1").isSome())
        assert.isTrue(result.find((s) => s === "release 1").isSome())
        assert.isTrue(result.find((s) => s === "start 2").isSome())
        assert.isTrue(result.find((s) => s === "release 2").isSome())
      }).unsafeRunPromise())

    it("interrupt waits for finalizer", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, number>())
        const fiber = $(
          deferred1.succeed(undefined)
            .zipRight(deferred2.await)
            .ensuring(ref.set(true).zipRight(Effect.sleep((10).millis)))
            .fork
        )
        $(deferred1.await)
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
