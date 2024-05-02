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
})
