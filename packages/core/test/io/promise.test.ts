import { Chunk } from "../../src/collection/immutable/Chunk"
import { Tuple } from "../../src/collection/immutable/Tuple"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Promise } from "../../src/io/Promise"
import { Ref } from "../../src/io/Ref"

describe("Promise", () => {
  it("complete a promise using succeed", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<never, number>())
      .bind("success", ({ promise }) => promise.succeed(32))
      .bind("result", ({ promise }) => promise.await())

    const { result, success } = await program.unsafeRunPromise()

    expect(success).toBe(true)
    expect(result).toBe(32)
  })

  it("complete a promise using complete", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<never, number>())
      .bind("ref", () => Ref.make(13))
      .tap(({ promise, ref }) => promise.complete(ref.updateAndGet((_) => _ + 1)))
      .bind("v1", ({ promise }) => promise.await())
      .bind("v2", ({ promise }) => promise.await())

    const { v1, v2 } = await program.unsafeRunPromise()

    expect(v1).toBe(14)
    expect(v2).toBe(14)
  })

  it("complete a promise using completeWith", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<never, number>())
      .bind("ref", () => Ref.make(13))
      .tap(({ promise, ref }) => promise.completeWith(ref.updateAndGet((_) => _ + 1)))
      .bind("v1", ({ promise }) => promise.await())
      .bind("v2", ({ promise }) => promise.await())

    const { v1, v2 } = await program.unsafeRunPromise()

    expect(v1).toBe(14)
    expect(v2).toBe(15)
  })

  it("fail a promise using fail", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<string, number>())
      .bind("success", ({ promise }) => promise.fail("error with fail"))
      .bind("result", ({ promise }) => promise.await().exit())

    const { result, success } = await program.unsafeRunPromise()

    expect(success).toBe(true)
    expect(result.isFailure()).toBe(true)
  })

  it("fail a promise using complete", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<string, number>())
      .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
      .bind("success", ({ promise, ref }) =>
        promise.complete(
          ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
        )
      )
      .bind("v1", ({ promise }) => promise.await().exit())
      .bind("v2", ({ promise }) => promise.await().exit())

    const { success, v1, v2 } = await program.unsafeRunPromise()

    expect(success).toBe(true)
    expect(v1.isFailure()).toBe(true)
    expect(v2.isFailure()).toBe(true)
  })

  it("fail a promise using completeWith", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<string, number>())
      .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
      .bind("success", ({ promise, ref }) =>
        promise.completeWith(
          ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
        )
      )
      .bind("v1", ({ promise }) => promise.await().exit())
      .bind("v2", ({ promise }) => promise.await().exit())

    const { success, v1, v2 } = await program.unsafeRunPromise()

    expect(success).toBe(true)
    expect(v1.isFailure()).toBe(true)
    expect(v2.isFailure()).toBe(true)
  })

  it("complete a promise twice", async () => {
    const program = Effect.Do()
      .bind("promise", () => Promise.make<string, number>())
      .tap(({ promise }) => promise.succeed(1))
      .bind("success", ({ promise }) => promise.complete(Effect.succeedNow(9)))
      .bind("result", ({ promise }) => promise.await())

    const { result, success } = await program.unsafeRunPromise()

    expect(success).toBe(false)
    expect(result).toBe(1)
  })

  it("interrupt a promise", async () => {
    const program = Promise.make<string, number>().flatMap((promise) =>
      promise.interrupt()
    )

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })

  it("poll a promise that is not completed yet", async () => {
    const program = Promise.make<string, number>().flatMap((promise) => promise.poll())

    const result = await program.unsafeRunPromise()

    expect(result.isNone()).toBe(true)
  })

  it("poll a promise that is completed", async () => {
    const program = Promise.make<string, number>()
      .tap((promise) => promise.succeed(12))
      .flatMap((promise) =>
        promise
          .poll()
          .someOrFail(() => "fail")
          .flatten()
          .exit()
      )

    const result = await program.unsafeRunPromise()

    expect(result).toEqual(Exit.succeed(12))
  })

  it("poll a promise that is failed", async () => {
    const program = Promise.make<string, number>()
      .tap((promise) => promise.fail("failure"))
      .flatMap((promise) =>
        promise
          .poll()
          .someOrFail(() => "fail")
          .flatten()
          .exit()
      )

    const result = await program.unsafeRunPromise()

    expect(result.isFailure()).toBe(true)
  })

  it("poll a promise that is interrupted", async () => {
    const program = Promise.make<string, number>()
      .tap((promise) => promise.interrupt())
      .flatMap((promise) =>
        promise
          .poll()
          .someOrFail(() => "fail")
          .flatten()
          .exit()
      )

    const result = await program.unsafeRunPromise()

    expect(result.isInterrupted()).toBe(true)
  })

  it("isDone when a promise is completed", async () => {
    const program = Promise.make<string, number>()
      .tap((promise) => promise.succeed(0))
      .flatMap((promise) => promise.isDone())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })

  it("isDone when a promise is failed", async () => {
    const program = Promise.make<string, number>()
      .tap((promise) => promise.fail("failure"))
      .flatMap((promise) => promise.isDone())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })
})
