import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"

describe("Fiber", () => {
  describe("track blockingOn", () => {
    it("in await", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.never.fork())
        .bind("f2", ({ f1 }) => f1.await().fork())
        .bind("blockingOn", ({ f2 }) =>
          f2._status
            .continueOrFail(
              () => undefined,
              (status) =>
                status._tag === "Suspended"
                  ? Option.some(status.blockingOn)
                  : Option.none
            )
            .eventually()
        )

      const { blockingOn, f1 } = await program.unsafeRunPromise()

      expect(blockingOn).toStrictEqual(f1.id)
    })
  })
})
