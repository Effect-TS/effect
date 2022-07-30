import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Fiber", () => {
  describe.concurrent("track blockingOn", () => {
    it("in await", () =>
      Do(($) => {
        const fiber1 = $(Effect.never.fork)
        const fiber2 = $(fiber1.await.fork)
        const blockingOn = $(
          fiber2._status
            .continueOrFail(constVoid, (status) =>
              status._tag === "Suspended"
                ? Maybe.some(status.blockingOn)
                : Maybe.none).eventually
        )
        assert.isTrue(blockingOn == fiber1.id)
      }).unsafeRunPromise())
  })
})
