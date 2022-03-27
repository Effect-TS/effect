import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
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
})
