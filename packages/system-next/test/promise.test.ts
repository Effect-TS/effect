import * as Chunk from "../src/Collections/Immutable/Chunk"
import * as Tp from "../src/Collections/Immutable/Tuple"
import * as T from "../src/Effect"
import * as Exit from "../src/Exit"
import { pipe } from "../src/Function"
import * as O from "../src/Option"
import * as Promise from "../src/Promise"
import * as Ref from "../src/Ref"

describe("Promise", () => {
  it("complete a promise using succeed", async () => {
    const { s, v } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<never, number>()),
      T.bind("s", ({ p }) => Promise.succeed_(p, 32)),
      T.bind("v", ({ p }) => Promise.await(p)),
      T.unsafeRunPromise
    )

    expect(s).toBe(true)
    expect(v).toBe(32)
  })

  it("complete a promise using complete", async () => {
    const { v1, v2 } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<never, number>()),
      T.bind("r", () => Ref.make(13)),
      T.bind("s", ({ p, r }) =>
        Promise.complete_(
          p,
          Ref.updateAndGet_(r, (_) => _ + 1)
        )
      ),
      T.bind("v1", ({ p }) => Promise.await(p)),
      T.bind("v2", ({ p }) => Promise.await(p)),
      T.unsafeRunPromise
    )

    expect(v1).toBe(14)
    expect(v2).toBe(14)
  })

  it("complete a promise using completeWith", async () => {
    const { v1, v2 } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<never, number>()),
      T.bind("r", () => Ref.make(13)),
      T.bind("s", ({ p, r }) =>
        Promise.completeWith_(
          p,
          Ref.updateAndGet_(r, (_) => _ + 1)
        )
      ),
      T.bind("v1", ({ p }) => Promise.await(p)),
      T.bind("v2", ({ p }) => Promise.await(p)),
      T.unsafeRunPromise
    )

    expect(v1).toBe(14)
    expect(v2).toBe(15)
  })

  it("fail a promise using fail", async () => {
    const { s, v } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.bind("s", ({ p }) => Promise.fail_(p, "error with fail")),
      T.bind("v", ({ p }) => T.exit(Promise.await(p))),
      T.unsafeRunPromise
    )

    expect(s).toBe(true)
    expect(Exit.isFailure(v)).toBeTruthy()
  })

  it("fail a promise using complete", async () => {
    const { s, v1, v2 } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.bind("r", () => Ref.make(Chunk.from(["first error", "second error"]))),
      T.bind("s", ({ p, r }) =>
        Promise.complete_(
          p,
          T.flip(
            Ref.modify_(r, (as) => Tp.tuple(Chunk.unsafeHead(as), Chunk.unsafeTail(as)))
          )
        )
      ),
      T.bind("v1", ({ p }) => T.exit(Promise.await(p))),
      T.bind("v2", ({ p }) => T.exit(Promise.await(p))),
      T.unsafeRunPromise
    )

    expect(s).toBe(true)
    expect(Exit.isFailure(v1)).toBeTruthy()
    expect(Exit.isFailure(v2)).toBeTruthy()
  })

  it("fail a promise using completeWith", async () => {
    const { s, v1, v2 } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.bind("r", () => Ref.make(Chunk.from(["first error", "second error"]))),
      T.bind("s", ({ p, r }) =>
        Promise.completeWith_(
          p,
          T.flip(
            Ref.modify_(r, (as) => Tp.tuple(Chunk.unsafeHead(as), Chunk.unsafeTail(as)))
          )
        )
      ),
      T.bind("v1", ({ p }) => T.exit(Promise.await(p))),
      T.bind("v2", ({ p }) => T.exit(Promise.await(p))),
      T.unsafeRunPromise
    )

    expect(s).toBe(true)
    expect(Exit.isFailure(v1)).toBeTruthy()
    expect(Exit.isFailure(v2)).toBeTruthy()
  })

  it("complete a promise twice", async () => {
    const { s, v } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.succeed_(p, 1)),
      T.bind("s", ({ p }) => Promise.complete_(p, T.succeedNow(9))),
      T.bind("v", ({ p }) => Promise.await(p)),
      T.unsafeRunPromise
    )

    expect(s).toBe(false)
    expect(v).toBe(1)
  })

  it("interrupt a promise", async () => {
    const { s } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.bind("s", ({ p }) => Promise.interrupt(p)),
      T.unsafeRunPromise
    )

    expect(s).toBe(true)
  })

  it("poll a promise that is not completed yet", async () => {
    const { attempt } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.bind("attempt", ({ p }) => Promise.poll(p)),
      T.unsafeRunPromise
    )

    expect(O.isNone(attempt)).toBeTruthy()
  })

  it("poll a promise that is completed", async () => {
    const { attempt } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.succeed_(p, 12)),
      T.bind("attempt", ({ p }) =>
        pipe(
          Promise.poll(p),
          T.someOrFail(() => "fail"),
          T.flatten,
          T.exit
        )
      ),
      T.unsafeRunPromise
    )

    expect(attempt).toEqual(Exit.succeed(12))
  })

  it("poll a promise that is failed", async () => {
    const { result } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.fail_(p, "failure")),
      T.bind("result", ({ p }) =>
        pipe(
          Promise.poll(p),
          T.someOrFail(() => "fail"),
          T.flatten,
          T.exit
        )
      ),
      T.unsafeRunPromise
    )

    expect(Exit.isFailure(result)).toBeTruthy()
  })

  it("poll a promise that is interrupted", async () => {
    const { result } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.interrupt(p)),
      T.bind("result", ({ p }) =>
        pipe(
          Promise.poll(p),
          T.someOrFail(() => "fail"),
          T.flatten,
          T.exit
        )
      ),
      T.unsafeRunPromise
    )

    expect(Exit.isInterrupted(result)).toBeTruthy()
  })

  it("isDone when a promise is completed", async () => {
    const { d } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.succeed_(p, 0)),
      T.bind("d", ({ p }) => Promise.isDone(p)),
      T.unsafeRunPromise
    )

    expect(d).toBe(true)
  })

  it("isDone when a promise is failed", async () => {
    const { d } = await pipe(
      T.do,
      T.bind("p", () => Promise.make<string, number>()),
      T.tap(({ p }) => Promise.fail_(p, "failure")),
      T.bind("d", ({ p }) => Promise.isDone(p)),
      T.unsafeRunPromise
    )

    expect(d).toBe(true)
  })
})
