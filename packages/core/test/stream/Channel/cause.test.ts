import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"

describe("Channel", () => {
  describe("error cause", () => {
    it("cause is propagated on channel interruption", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make<Exit<unknown, unknown>>(Exit.unit))
        .tap(({ promise, ref }) =>
          Channel.fromEffect(promise.succeed(undefined) > Effect.never)
            .runDrain()
            .onExit((exit) => ref.set(exit))
            .raceEither(promise.await())
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })
  })
})
