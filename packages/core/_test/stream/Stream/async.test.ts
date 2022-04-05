import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("async", () => {
    it("async", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Stream.async<unknown, never, number>((emit) => {
        chunk.forEach((n) => {
          emit(Effect.succeed(Chunk.single(n)))
        })
      })
        .take(chunk.size)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })
  })

  describe("asyncMaybe", () => {
    test("signal end stream", async () => {
      const program = Stream.asyncMaybe<unknown, never, number>((emit) => {
        emit(Effect.fail(Option.none))
        return Option.none
      }).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("Some", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Stream.asyncMaybe<unknown, never, number>(() =>
        Option.some(Stream.fromChunk(chunk))
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })

    it("None", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Stream.asyncMaybe<unknown, never, number>((emit) => {
        chunk.forEach((n) => {
          emit(Effect.succeed(Chunk.single(n)))
        })
        return Option.none
      })
        .take(chunk.size)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })

    // TODO(Mike/Max): determine implementation
    // it("back pressure", async () => {
    //   const program = Effect.Do()
    //     .bind("refCount", () => Ref.make(0))
    //     .bind("refDone", () => Ref.make(false))
    //     .bindValue("stream", ({ refCount, refDone }) =>
    //       Stream.asyncMaybe<unknown, never, number>((emit) => {
    //         setTimeout(() => {
    //           Chunk.range(0, 7).forEach((n) => {
    //             emit(refCount.set(n) > Effect.succeed(Chunk.single(1)))
    //           })
    //           emit(refDone.set(true) > Effect.fail(Option.none))
    //         })
    //         return Option.none
    //       }, 5)
    //     )
    //     .bind("run", ({ stream }) => stream.run(Sink.take(1) > Sink.never).fork())
    //     .tap(({ refCount }) =>
    //       refCount.get().repeat(Schedule.recurWhile((n) => n !== 7))
    //     )
    //     .bind("isDone", ({ refDone }) => refDone.get())
    //     .tap(({ run }) => run.interrupt())

    //   const { isDone } = await program.unsafeRunPromise()

    //   expect(isDone).toBe(false)
    // })
  })

  describe("asyncEffect", () => {
    it("simple example", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch }) =>
          Stream.asyncEffect((emit) => {
            chunk.forEach((n) => {
              emit(Effect.succeed(Chunk.single(n)))
            })
            return latch.succeed(undefined) > Effect.unit
          })
            .take(chunk.size)
            .runCollect()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .flatMap(({ fiber }) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })

    it("signal end stream", async () => {
      const program = Stream.asyncEffect<unknown, never, number, void>((emit) => {
        emit(Effect.fail(Option.none))
        return Effect.unit
      }).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    // TODO(Mike/Max): determine implementation
    // it("back pressure", async () => {
    //   const promise = Promise.unsafeMake<never, void>(FiberId.none)
    //   const program = Effect.Do()
    //     .bind("refCount", () => Ref.make(0))
    //     .bind("refDone", () => Ref.make(false))
    //     .bindValue("stream", ({ refCount, refDone }) =>
    //       Stream.asyncEffect<unknown, never, number, void>((emit) => {
    //         const t1 = setTimeout(() => {
    //           Chunk.range(0, 7).forEach((n) => {
    //             emit(refCount.set(n) > Effect.succeed(Chunk.single(1)))
    //           })
    //         }, 10)
    //         const t2 = setTimeout(() => {
    //           emit(refDone.set(true) > Effect.fail(Option.none))
    //         }, 100)
    //         return Effect.succeed(() => {
    //           clearTimeout(t1)
    //           clearTimeout(t2)
    //         })
    //       }, 5)
    //     )
    //     .bind("run", ({ stream }) =>
    //       stream.run(Sink.take(1) > Sink.fromEffect(promise.await())).fork()
    //     )
    //     .tap(({ refCount }) => refCount.get.repeat(Schedule.recurWhile((n) => n !== 7)))
    //     .bind("isDone", ({ refDone }) => refDone.get)
    //     .tap(({ run }) => run.interrupt())

    //   const { isDone } = await program.unsafeRunPromise()
    //   await promise.succeed(undefined).unsafeRunPromise()

    //   expect(isDone).toBe(false)
    // })
  })

  describe("asyncManaged", () => {
    it("asyncManaged", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch }) =>
          Stream.asyncScoped<unknown, never, number>((cb) => {
            chunk.forEach((n) => {
              cb(Effect.succeed(Chunk.single(n)))
            })
            return latch.succeed(undefined) > Effect.unit
          })
            .take(chunk.size)
            .run(Sink.collectAll<number>())
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .flatMap(({ fiber }) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })

    it("asyncManaged signal end stream", async () => {
      const program = Stream.asyncScoped<unknown, never, number>((cb) => {
        cb(Effect.fail(Option.none))
        return Effect.unit
      }).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    // TODO(Mike/Max): determine implementation
    // it("asyncManaged back pressure", async () => {
    //   for {
    //     refCnt  <- Ref.make(0)
    //     refDone <- Ref.make[Boolean](false)
    //     stream = ZStream.asyncManaged[Any, Throwable, Int](
    //                cb => {
    //                  Future
    //                    .sequence(
    //                      (1 to 7).map(i => cb(refCnt.set(i) *> ZIO.succeedNow(Chunk.single(1))))
    //                    )
    //                    .flatMap(_ => cb(refDone.set(true) *> ZIO.fail(None)))
    //                  UIO.unit.toManaged
    //                },
    //                5
    //              )
    //     run    <- stream.run(ZSink.take(1) *> ZSink.never).fork
    //     _      <- refCnt.get.repeatWhile(_ != 7)
    //     isDone <- refDone.get
    //     _      <- run.interrupt
    //   } yield assert(isDone)(isFalse)
    // })
  })

  describe("asyncInterrupt", () => {
    it("Left", async () => {
      const program = Effect.Do()
        .bind("cancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ cancelled, latch }) =>
          Stream.asyncInterrupt<unknown, never, void>((emit) => {
            emit.chunk(Chunk.single(undefined))
            return Either.left(cancelled.set(true))
          })
            .tap(() => latch.succeed(undefined))
            .runDrain()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("Right", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Stream.asyncInterrupt<unknown, never, number>(() =>
        Either.right(Stream.fromChunk(chunk))
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })

    it("signal end stream", async () => {
      const program = Stream.asyncInterrupt<unknown, never, number>((emit) => {
        emit.end()
        return Either.left(Effect.succeedNow(undefined))
      }).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    // TODO(Mike/Max): determine implementation
    // it("asyncInterrupt back pressure", async () => {
    //   for {
    //     selfId  <- ZIO.fiberId
    //     refCnt  <- Ref.make(0)
    //     refDone <- Ref.make[Boolean](false)
    //     stream = ZStream.asyncInterrupt[Any, Throwable, Int](
    //                cb => {
    //                  Future
    //                    .sequence(
    //                      (1 to 7).map(i => cb(refCnt.set(i) *> ZIO.succeedNow(Chunk.single(1))))
    //                    )
    //                    .flatMap(_ => cb(refDone.set(true) *> ZIO.fail(None)))
    //                  Left(UIO.unit)
    //                },
    //                5
    //              )
    //     run    <- stream.run(ZSink.take(1) *> ZSink.never).fork
    //     _      <- refCnt.get.repeatWhile(_ != 7)
    //     isDone <- refDone.get
    //     exit   <- run.interrupt
    //   } yield assert(isDone)(isFalse) &&
    //     assert(exit.untraced)(failsCause(containsCause(Cause.interrupt(selfId))))
    // })
  })
})
