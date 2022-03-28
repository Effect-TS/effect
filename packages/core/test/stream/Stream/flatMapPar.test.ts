import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Random } from "../../../src/io/Random"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("flatMapPar", () => {
    it("guarantee ordering", async () => {
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        flatMap: stream.flatMap((i) => Stream(i, i)).runCollect(),
        flatMapPar: stream.flatMapPar(1, (i) => Stream(i, i)).runCollect()
      })

      const { flatMap, flatMapPar } = await program.unsafeRunPromise()

      expect(flatMap.toArray()).toEqual(flatMapPar.toArray())
    })

    it("consistent with flatMap", async () => {
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Random.nextIntBetween(1, 10000).flatMap((n) =>
        Effect.struct({
          flatMap: stream.flatMap((i) => Stream(i, i)).runCollect(),
          flatMapPar: stream.flatMapPar(n, (i) => Stream(i, i)).runCollect()
        })
      )

      const { flatMap, flatMapPar } = await program.unsafeRunPromise()

      expect(flatMap.toArray()).toEqual(flatMapPar.toArray())
    })

    it("interruption propagation", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch, substreamCancelled }) =>
          Stream(undefined)
            .flatMapPar(1, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ substreamCancelled }) => substreamCancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("inner errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                substreamCancelled.set(true)
              )
            ),
            Stream.fromEffect(latch.await() > Effect.fail("ouch"))
          )
            .flatMapPar(2, identity)
            .runDrain()
            .either()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result).toEqual(Either.left("ouch"))
    })

    it("outer errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.fail("ouch")))
            .flatMapPar(2, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .either()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result).toEqual(Either.left("ouch"))
    })

    it("inner defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                substreamCancelled.set(true)
              )
            ),
            Stream.fromEffect(latch.await() > Effect.die(error))
          )
            .flatMapPar(2, identity)
            .runDrain()
            .exit()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("outer defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.die(error)))
            .flatMapPar(2, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .exit()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("finalizer ordering", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.prepend(label))
        )
        .bindValue("inner", ({ push }) =>
          Stream.acquireReleaseWith(push("InnerAcquire"), () => push("InnerRelease"))
        )
        .tap(({ inner, push }) =>
          Stream.acquireReleaseWith(push("OuterAcquire").as(inner), () =>
            push("OuterRelease")
          )
            .flatMapPar(2, identity)
            .runDrain()
        )
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        "OuterRelease",
        "InnerRelease",
        "InnerAcquire",
        "OuterAcquire"
      ])
    })
  })
})
