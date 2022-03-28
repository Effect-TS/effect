import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Ref } from "../../../src/io/Ref"
import { Schedule } from "../../../src/io/Schedule"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("repeat", () => {
    it("simple example", async () => {
      const program = Stream(1).repeat(Schedule.recurs(4)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1, 1, 1, 1])
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("fiber", ({ ref }) =>
          Stream.fromEffect(ref.update((list) => list.prepend(1)))
            .repeat(Schedule.spaced(Duration(10)))
            .take(2)
            .runDrain()
            .fork()
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })

    it("does not swallow errors on a repetition", async () => {
      const program = Ref.make(0).flatMap((counter) =>
        Stream.fromEffect(
          counter
            .getAndUpdate((n) => n + 1)
            .flatMap((n) => (n <= 2 ? Effect.succeed(n) : Effect.fail("boom")))
        )
          .repeat(Schedule.recurs(3))
          .runDrain()
          .exit()
      )

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.fail("boom"))
    })
  })

  describe("repeatEffect", () => {
    it("emit elements", async () => {
      const program = Stream.repeatEffect(Effect.succeed(1)).take(2).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })
  })

  describe("repeatEffectOption", () => {
    it("emit elements", async () => {
      const program = Stream.repeatEffectOption(Effect.succeed(1)).take(2).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })

    it("emit elements until pull fails with None", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) =>
          ref
            .updateAndGet((n) => n + 1)
            .flatMap((n) => (n >= 5 ? Effect.fail(Option.none) : Effect.succeed(n)))
        )
        .flatMap(({ effect }) =>
          Stream.repeatEffectOption(effect).take(10).runCollect()
        )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4])
    })

    it("stops evaluating the effect once it fails with None", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) =>
          Stream.repeatEffectOption(
            ref.getAndUpdate((n) => n + 1) > Effect.fail(Option.none)
          )
            .toPull()
            .use((pull) => pull.ignore() > pull.ignore())
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(1)
    })
  })

  describe("repeatEither", () => {
    it("emits schedule output", async () => {
      const program = Stream(1).repeatEither(Schedule.recurs(4)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(1),
        Either.left(0),
        Either.right(1),
        Either.left(1),
        Either.right(1),
        Either.left(2),
        Either.right(1),
        Either.left(3)
      ])
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("fiber", ({ ref }) =>
          Stream.fromEffect(ref.update((list) => list.prepend(1)))
            .repeatEither(Schedule.spaced(Duration(10)))
            .take(3)
            .runDrain()
            .fork()
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })
  })

  describe("repeatElements", () => {
    it("repeatElementsWith", async () => {
      const program = Stream("A", "B", "C")
        .repeatElementsWith(
          Schedule.recurs(0) > Schedule.fromFunction(() => 123),
          identity,
          (n) => n.toString()
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["A", "123", "B", "123", "C", "123"])
    })

    it("repeatElementsEither", async () => {
      const program = Stream("A", "B", "C")
        .repeatElementsEither(Schedule.recurs(0) > Schedule.fromFunction(() => 123))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right("A"),
        Either.left(123),
        Either.right("B"),
        Either.left(123),
        Either.right("C"),
        Either.left(123)
      ])
    })

    it("repeated && assert spaced", async () => {
      const program = Stream("A", "B", "C").repeatElements(Schedule.once).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["A", "A", "B", "B", "C", "C"])
    })

    it("short circuits in schedule", async () => {
      const program = Stream("A", "B", "C")
        .repeatElements(Schedule.once)
        .take(4)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["A", "A", "B", "B"])
    })

    it("short circuits after schedule", async () => {
      const program = Stream("A", "B", "C")
        .repeatElements(Schedule.once)
        .take(3)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["A", "A", "B"])
    })
  })

  describe("repeatEffectWithSchedule", () => {
    it("succeed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("fiber", ({ ref }) =>
          Stream.repeatEffectWithSchedule(
            ref.update((list) => list.prepend(1)),
            Schedule.spaced(Duration(10))
          )
            .take(2)
            .runDrain()
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })

    it("allow schedule rely on effect value", async () => {
      const length = 20
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) =>
          ref.getAndUpdate((n) => n + 1).filterOrFail((n) => n <= length, undefined)
        )
        .bindValue("schedule", () =>
          Schedule.identity<number>().whileInput((n) => n < length)
        )
        .flatMap(({ effect, schedule }) =>
          Stream.repeatEffectWithSchedule(effect, schedule).runCollect()
        )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, length).toArray())
    })

    it("should perform repetitions in addition to the first execution (one repetition)", async () => {
      const program = Stream.repeatEffectWithSchedule(
        Effect.succeed(1),
        Schedule.once
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
    })

    it("should perform repetitions in addition to the first execution (zero repetitions)", async () => {
      const program = Stream.repeatEffectWithSchedule(
        Effect.succeed(1),
        Schedule.stop
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })

    // TODO(Max/Mike): implement after TestClock
    it.skip("emits before delaying according to the schedule", async () => {
      // val interval = 1.second
      // for {
      //   collected <- Ref.make(0)
      //   effect     = ZIO.unit
      //   schedule   = Schedule.spaced(interval)
      //   streamFiber <- ZStream
      //                    .repeatZIOWithSchedule(effect, schedule)
      //                    .tap(_ => collected.update(_ + 1))
      //                    .runDrain
      //                    .fork
      //   _                      <- TestClock.adjust(0.seconds)
      //   nrCollectedImmediately <- collected.get
      //   _                      <- TestClock.adjust(1.seconds)
      //   nrCollectedAfterDelay  <- collected.get
      //   _                      <- streamFiber.interrupt
      // } yield assert(nrCollectedImmediately)(equalTo(1)) && assert(nrCollectedAfterDelay)(equalTo(2))
    })
  })
})
