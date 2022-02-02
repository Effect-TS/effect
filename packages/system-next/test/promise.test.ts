import { Chunk } from "../src/collection/immutable/Chunk"
import { Tuple } from "../src/collection/immutable/Tuple"
import { Effect } from "../src/io/Effect"
import { Exit } from "../src/io/Exit"
import { Promise } from "../src/io/Promise"
import * as Ref from "../src/io/Ref"

describe("Promise", () => {
  it("complete a promise using succeed", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<never, number>())
      .bind("s", ({ p }) => p.succeed(32))
      .bind("v", ({ p }) => p.await())

    const { s, v } = await program.unsafeRunPromise()

    expect(s).toBe(true)
    expect(v).toBe(32)
  })

  it("complete a promise using complete", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<never, number>())
      .bind("r", () => Ref.make(13))
      .bind("s", ({ p, r }) => p.complete(Ref.updateAndGet_(r, (_) => _ + 1)))
      .bind("v1", ({ p }) => p.await())
      .bind("v2", ({ p }) => p.await())

    const { v1, v2 } = await program.unsafeRunPromise()

    expect(v1).toBe(14)
    expect(v2).toBe(14)
  })

  it("complete a promise using completeWith", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<never, number>())
      .bind("r", () => Ref.make(13))
      .bind("s", ({ p, r }) => p.completeWith(Ref.updateAndGet_(r, (_) => _ + 1)))
      .bind("v1", ({ p }) => p.await())
      .bind("v2", ({ p }) => p.await())

    const { v1, v2 } = await program.unsafeRunPromise()

    expect(v1).toBe(14)
    expect(v2).toBe(15)
  })

  it("fail a promise using fail", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<string, number>())
      .bind("s", ({ p }) => p.fail("error with fail"))
      .bind("v", ({ p }) => p.await().exit())

    const { s, v } = await program.unsafeRunPromise()

    expect(s).toBe(true)
    expect(v.isFailure()).toBeTruthy()
  })

  it("fail a promise using complete", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<string, number>())
      .bind("r", () => Ref.make(Chunk.from(["first error", "second error"])))
      .bind("s", ({ p, r }) =>
        p.complete(
          Ref.modify_(r, (as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
        )
      )
      .bind("v1", ({ p }) => p.await().exit())
      .bind("v2", ({ p }) => p.await().exit())

    const { s, v1, v2 } = await program.unsafeRunPromise()

    expect(s).toBe(true)
    expect(v1.isFailure()).toBeTruthy()
    expect(v2.isFailure()).toBeTruthy()
  })

  it("fail a promise using completeWith", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<string, number>())
      .bind("r", () => Ref.make(Chunk.from(["first error", "second error"])))
      .bind("s", ({ p, r }) =>
        p.completeWith(
          Ref.modify_(r, (as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
        )
      )
      .bind("v1", ({ p }) => p.await().exit())
      .bind("v2", ({ p }) => p.await().exit())

    const { s, v1, v2 } = await program.unsafeRunPromise()

    expect(s).toBe(true)
    expect(v1.isFailure()).toBeTruthy()
    expect(v2.isFailure()).toBeTruthy()
  })

  it("complete a promise twice", async () => {
    const program = Effect.Do()
      .bind("p", () => Promise.make<string, number>())
      .tap(({ p }) => p.succeed(1))
      .bind("s", ({ p }) => p.complete(Effect.succeedNow(9)))
      .bind("v", ({ p }) => p.await())

    const { s, v } = await program.unsafeRunPromise()

    expect(s).toBe(false)
    expect(v).toBe(1)
  })

  it("interrupt a promise", async () => {
    const program = Promise.make<string, number>().flatMap((p) => p.interrupt())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })

  it("poll a promise that is not completed yet", async () => {
    const program = Promise.make<string, number>().flatMap((p) => p.poll())

    const result = await program.unsafeRunPromise()

    expect(result.isNone()).toBeTruthy()
  })

  it("poll a promise that is completed", async () => {
    const program = Promise.make<string, number>()
      .tap((p) => p.succeed(12))
      .flatMap((p) =>
        p
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
      .tap((p) => p.succeed(0))
      .flatMap((p) => p.isDone())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })

  it("isDone when a promise is failed", async () => {
    const program = Promise.make<string, number>()
      .tap((p) => p.fail("failure"))
      .flatMap((p) => p.isDone())

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })
})
