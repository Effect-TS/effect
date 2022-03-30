import type { Has } from "../../../src/data/Has"
import { Effect } from "../../../src/io/Effect"
import { NumberService } from "./test-utils"

describe("Effect", () => {
  describe("RTS environment", () => {
    it("provide is modular", async () => {
      const program = Effect.Do()
        .bind("v1", () => Effect.service(NumberService))
        .bind("v2", () =>
          Effect.service(NumberService).provideEnvironment(NumberService.has({ n: 2 }))
        )
        .bind("v3", () => Effect.service(NumberService))
        .provideEnvironment(NumberService.has({ n: 4 }))

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1.n).toBe(4)
      expect(v2.n).toBe(2)
      expect(v3.n).toBe(4)
    })

    it("async can use environment", async () => {
      const program = Effect.async<Has<NumberService>, never, number>((cb) =>
        cb(Effect.service(NumberService).map(({ n }) => n))
      ).provideEnvironment(NumberService.has({ n: 10 }))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })
})
