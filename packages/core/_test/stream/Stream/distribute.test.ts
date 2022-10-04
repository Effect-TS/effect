import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("distributedWithDynamic", () => {
    it("ensures no race between subscription and stream end", () =>
      Do(($) => {
        const effect = Stream.empty
          .distributedWithDynamic(1, () => Effect.succeed(constTrue))
          .flatMap((add) => {
            const subscribe = Stream.unwrap(
              add.map(([_, queue]) => Stream.fromQueue(queue).collectWhileSuccess)
            )
            return Deferred.make<never, void>().flatMap((onEnd) =>
              subscribe
                .ensuring(onEnd.succeed(undefined))
                .runDrain.fork.zipRight(onEnd.await)
                .zipRight(subscribe.runDrain)
                .zipRight(Effect.succeed(true))
            )
          })
        const result = $(Effect.scoped(effect))
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
