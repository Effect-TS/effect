import { Context, Either, Option, Smol } from "effect"
import { assert, describe, it } from "effect-test/utils/extend"

describe("Smol", () => {
  it("runPromise", async () => {
    const result = await Smol.runPromise(Smol.succeed(1))
    assert.strictEqual(result, 1)
  })

  it("acquireUseRelease abort", async () => {
    let acquire = false
    let use = false
    let release = false
    const handle = Smol.acquireUseRelease(
      Smol.sync(() => {
        acquire = true
        return 123
      }).pipe(Smol.delay(100)),
      () =>
        Smol.sync(() => {
          use = true
        }),
      (_) =>
        Smol.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Smol.runFork)
    handle.unsafeAbort()
    const result = await Smol.runPromise(handle.await)
    assert.deepStrictEqual(result, Either.left(Smol.FailureAborted))
    assert.isTrue(acquire)
    assert.isFalse(use)
    assert.isTrue(release)
  })

  it("acquireUseRelease uninterruptible", async () => {
    let acquire = false
    let use = false
    let release = false
    const handle = Smol.acquireUseRelease(
      Smol.sync(() => {
        acquire = true
        return 123
      }).pipe(Smol.delay(100)),
      (_) =>
        Smol.sync(() => {
          use = true
          return _
        }),
      (_) =>
        Smol.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Smol.uninterruptible, Smol.runFork)
    handle.unsafeAbort()
    const result = await Smol.runPromise(handle.await)
    assert.deepStrictEqual(result, Either.right(123))
    assert.isTrue(acquire)
    assert.isTrue(use)
    assert.isTrue(release)
  })

  class ATag extends Context.Tag("ATag")<ATag, "A">() {}

  it("Context.Tag", () =>
    ATag.pipe(
      Smol.tap((_) => Smol.sync(() => assert.strictEqual(_, "A"))),
      Smol.provideService(ATag, "A"),
      Smol.runPromise
    ))

  it("Option", () =>
    Option.some("A").pipe(
      Smol.tap((_) => Smol.sync(() => assert.strictEqual(_, "A"))),
      Smol.runPromise
    ))

  it("Either", () =>
    Either.right("A").pipe(
      Smol.tap((_) => Smol.sync(() => assert.strictEqual(_, "A"))),
      Smol.runPromise
    ))

  it("gen", () =>
    Smol.gen(function*(_) {
      const result = yield* Smol.succeed(1)
      assert.strictEqual(result, 1)
      return result
    }).pipe(Smol.runPromise).then((_) => assert.deepStrictEqual(_, 1)))

  describe("forEach", () => {
    it("sequential", () =>
      Smol.gen(function*(_) {
        const results = yield* Smol.forEach([1, 2, 3], (_) => Smol.succeed(_))
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Smol.runPromise))

    it("unbounded", () =>
      Smol.gen(function*(_) {
        const results = yield* Smol.forEach([1, 2, 3], (_) => Smol.succeed(_), { concurrency: "unbounded" })
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Smol.runPromise))

    it("bounded", () =>
      Smol.gen(function*(_) {
        const results = yield* Smol.forEach([1, 2, 3, 4, 5], (_) => Smol.succeed(_), { concurrency: 2 })
        assert.deepStrictEqual(results, [1, 2, 3, 4, 5])
      }).pipe(Smol.runPromise))

    it("inherit unbounded", () =>
      Smol.gen(function*(_) {
        const handle = yield* Smol.forEach([1, 2, 3], (_) => Smol.succeed(_).pipe(Smol.delay(50)), {
          concurrency: "inherit"
        }).pipe(
          Smol.withConcurrency("unbounded"),
          Smol.fork
        )
        yield* Smol.sleep(55)
        assert.deepStrictEqual(handle.unsafePoll(), Either.right([1, 2, 3]))
      }).pipe(Smol.runPromise))

    it("sequential interrupt", () =>
      Smol.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Smol.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Smol.sync(() => {
            done.push(i)
            return i
          }).pipe(Smol.delay(50))).pipe(Smol.fork)
        yield* Smol.sleep(125)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Smol.FailureAborted))
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Smol.runPromise))

    it("unbounded interrupt", () =>
      Smol.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Smol.forEach([1, 2, 3], (i) =>
          Smol.sync(() => {
            done.push(i)
            return i
          }).pipe(Smol.delay(50)), { concurrency: "unbounded" }).pipe(Smol.fork)
        yield* Smol.sleep(25)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Smol.FailureAborted))
        assert.deepStrictEqual(done, [])
      }).pipe(Smol.runPromise))

    it("bounded interrupt", () =>
      Smol.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Smol.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Smol.sync(() => {
            done.push(i)
            return i
          }).pipe(Smol.delay(50)), { concurrency: 2 }).pipe(Smol.fork)
        yield* Smol.sleep(75)
        yield* handle.abort
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Smol.FailureAborted))
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Smol.runPromise))

    it("unbounded fail", () =>
      Smol.gen(function*(_) {
        const done: Array<number> = []
        const handle = yield* Smol.forEach([1, 2, 3, 4, 5], (i) =>
          Smol.suspend(() => {
            done.push(i)
            return i === 3 ? Smol.fail("error") : Smol.succeed(i)
          }).pipe(Smol.delay(i * 10)), {
          concurrency: "unbounded"
        }).pipe(Smol.fork)
        const result = yield* handle.await
        assert.deepStrictEqual(result, Either.left(Smol.FailureExpected("error")))
        assert.deepStrictEqual(done, [1, 2, 3])
      }).pipe(Smol.runPromise))
  })

  describe("acquireRelease", () => {
    it("releases on abort", () =>
      Smol.gen(function*(_) {
        let release = false
        const handle = yield* Smol.acquireRelease(
          Smol.delay(Smol.succeed("foo"), 100),
          () =>
            Smol.sync(() => {
              release = true
            })
        ).pipe(Smol.scoped, Smol.fork)
        handle.unsafeAbort()
        console.log(yield* handle.await)
        assert.strictEqual(release, true)
      }).pipe(Smol.runPromise))
  })
})
