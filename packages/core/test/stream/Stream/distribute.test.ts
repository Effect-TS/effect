import { constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("distributedWithDynamic", () => {
    it("ensures no race between subscription and stream end", async () => {
      const program = Effect.scoped(
        Stream.empty
          .distributedWithDynamic(1, () => Effect.succeedNow(constTrue))
          .flatMap((add) => {
            const subscribe = Stream.unwrap(
              add.map(({ tuple: [_, queue] }) =>
                Stream.fromQueue(queue).collectWhileSuccess()
              )
            )

            return Promise.make<never, void>().flatMap(
              (onEnd) =>
                subscribe.ensuring(onEnd.succeed(undefined)).runDrain().fork() >
                onEnd.await() >
                subscribe.runDrain() >
                Effect.succeedNow(true)
            )
          })
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
