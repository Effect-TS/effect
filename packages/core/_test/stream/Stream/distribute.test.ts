import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("distributedWithDynamic", () => {
    it("ensures no race between subscription and stream end", async () => {
      const program = Effect.scoped(
        Stream.empty
          .distributedWithDynamic(1, () => Effect.succeedNow(constTrue))
          .flatMap((add) => {
            const subscribe = Stream.unwrap(
              add.map(({ tuple: [_, queue] }) => Stream.fromQueue(queue).collectWhileSuccess)
            )

            return Deferred.make<never, void>().flatMap(
              (onEnd) =>
                subscribe.ensuring(onEnd.succeed(undefined)).runDrain.fork >
                  onEnd.await() >
                  subscribe.runDrain >
                  Effect.succeedNow(true)
            )
          })
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
