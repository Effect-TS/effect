import { Cause, Context, Effect, Either, Micro, Option } from "effect"
import { assert, describe, it } from "effect-test/utils/extend"

class ATag extends Context.Tag("ATag")<ATag, "A">() {}

describe("Smol", () => {
  it("runPromise", async () => {
    const result = await Micro.runPromise(Micro.succeed(1))
    assert.strictEqual(result, 1)
  })

  it("acquireUseRelease abort", async () => {
    let acquire = false
    let use = false
    let release = false
    const handle = Micro.acquireUseRelease(
      Micro.sync(() => {
        acquire = true
        return 123
      }).pipe(Micro.delay(100)),
      () =>
        Micro.sync(() => {
          use = true
        }),
      (_) =>
        Micro.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Micro.runFork)
    handle.unsafeAbort()
    const result = await Micro.runPromise(handle.await)
    assert.deepStrictEqual(result, Either.left(Micro.FailureAborted))
    assert.isTrue(acquire)
    assert.isFalse(use)
    assert.isTrue(release)
  })

  it("acquireUseRelease uninterruptible", async () => {
    let acquire = false
    let use = false
    let release = false
    const handle = Micro.acquireUseRelease(
      Micro.sync(() => {
        acquire = true
        return 123
      }).pipe(Micro.delay(100)),
      (_) =>
        Micro.sync(() => {
          use = true
          return _
        }),
      (_) =>
        Micro.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Micro.uninterruptible, Micro.runFork)
    handle.unsafeAbort()
    const result = await Micro.runPromise(handle.await)
    assert.deepStrictEqual(result, Either.right(123))
    assert.isTrue(acquire)
    assert.isTrue(use)
    assert.isTrue(release)
  })

  it("Context.Tag", () =>
    ATag.pipe(
      Micro.tap((_) => Micro.sync(() => assert.strictEqual(_, "A"))),
      Micro.provideService(ATag, "A"),
      Micro.runPromise
    ))

  it("Option", () =>
    Option.some("A").pipe(
      Micro.tap((_) => Micro.sync(() => assert.strictEqual(_, "A"))),
      Micro.runPromise
    ))

  it("Either", () =>
    Either.right("A").pipe(
      Micro.tap((_) => Micro.sync(() => assert.strictEqual(_, "A"))),
      Micro.runPromise
    ))

  it("gen", () =>
    Micro.gen(function*(_) {
      const result = yield* Micro.succeed(1)
      assert.strictEqual(result, 1)
      return result
    }).pipe(Micro.runPromise).then((_) => assert.deepStrictEqual(_, 1)))

  describe("forEach", () => {
    it("sequential", () =>
      Micro.gen(function*(_) {
        const results = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_))
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("unbounded", () =>
      Micro.gen(function*(_) {
        const results = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_), { concurrency: "unbounded" })
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("bounded", () =>
      Micro.gen(function*(_) {
        const results = yield* Micro.forEach([1, 2, 3, 4, 5], (_) => Micro.succeed(_), { concurrency: 2 })
        assert.deepStrictEqual(results, [1, 2, 3, 4, 5])
      }).pipe(Micro.runPromise))

    it("inherit unbounded", () =>
      Micro.gen(function*(_) {
        const handle = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_).pipe(Micro.delay(50)), {
          concurrency: "inherit"
        }).pipe(
          Micro.withConcurrency("unbounded"),
          Micro.fork
        )
        yield* Micro.sleep(55)
        assert.deepStrictEqual(handle.unsafePoll(), Either.right([1, 2, 3]))
      }).pipe(Micro.runPromise))

    it("sequential interrupt", () =>
      Micro.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Micro.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(50))).pipe(Micro.fork)
        yield* Micro.sleep(125)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Micro.FailureAborted))
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Micro.runPromise))

    it("unbounded interrupt", () =>
      Micro.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Micro.forEach([1, 2, 3], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(50)), { concurrency: "unbounded" }).pipe(Micro.fork)
        yield* Micro.sleep(25)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Micro.FailureAborted))
        assert.deepStrictEqual(done, [])
      }).pipe(Micro.runPromise))

    it("bounded interrupt", () =>
      Micro.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Micro.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(50)), { concurrency: 2 }).pipe(Micro.fork)
        yield* Micro.sleep(75)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Micro.FailureAborted))
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Micro.runPromise))

    it("unbounded fail", () =>
      Micro.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Micro.forEach([1, 2, 3, 4, 5], (i) =>
          Micro.suspend(() => {
            done.push(i)
            return i === 3 ? Micro.fail("error") : Micro.succeed(i)
          }).pipe(Micro.delay(i * 10)), {
          concurrency: "unbounded"
        }).pipe(Micro.fork)
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Micro.FailureExpected("error")))
        assert.deepStrictEqual(done, [1, 2, 3])
      }).pipe(Micro.runPromise))
  })

  describe("acquireRelease", () => {
    it("releases on abort", () =>
      Micro.gen(function*(_) {
        let release = false
        const handle = yield* Micro.acquireRelease(
          Micro.delay(Micro.succeed("foo"), 100),
          () =>
            Micro.sync(() => {
              release = true
            })
        ).pipe(Micro.scoped, Micro.fork)
        handle.unsafeAbort()
        yield* handle.await
        assert.strictEqual(release, true)
      }).pipe(Micro.runPromise))
  })

  describe.only("valid Effect", () => {
    it.effect("success", () =>
      Effect.gen(function*(_) {
        const result = yield* Micro.succeed(123)
        assert.strictEqual(result, 123)
      }))

    it.effect("failure", () =>
      Effect.gen(function*(_) {
        const result = yield* Micro.fail("boom").pipe(
          Effect.sandbox,
          Effect.flip
        )
        assert.deepStrictEqual(result, Cause.fail("boom"))
      }))

    it.effect("defects", () =>
      Effect.gen(function*(_) {
        const result = yield* Micro.die("boom").pipe(
          Effect.sandbox,
          Effect.flip
        )
        assert.deepStrictEqual(result, Cause.die("boom"))
      }))

    it.effect("context", () =>
      Effect.gen(function*(_) {
        const result = yield* ATag.pipe(
          Micro.map((_) => _)
        )
        assert.deepStrictEqual(result, "A")
      }).pipe(Effect.provideService(ATag, "A")))
  })
})
