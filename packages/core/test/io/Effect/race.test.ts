import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("raceAll", () => {
    it("returns first success", async () => {
      const program = Effect.fail("fail").raceAll(List(Effect.succeed(24)))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })

    it("returns last failure", async () => {
      const program = (Effect.sleep(Duration(100)) > Effect.fail(24))
        .raceAll(List(Effect.fail(25)))
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })

    it("returns success when it happens after failure", async () => {
      const program = Effect.fail(42).raceAll(
        List(Effect.succeed(24) < Effect.sleep(Duration(100)))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })
  })
})
