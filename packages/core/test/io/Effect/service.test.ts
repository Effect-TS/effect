import { Effect } from "../../../src/io/Effect"
import { NumberService } from "./test-utils"

describe("Effect", () => {
  describe("serviceWith", () => {
    it("effectfully accesses a service in the environment", async () => {
      const program = Effect.serviceWithEffect(NumberService)(({ n }) =>
        Effect.succeed(n + 3)
      ).provideEnvironment(NumberService.has({ n: 0 }))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(3)
    })
  })

  describe("updateService", () => {
    it("updates a service in the environment", async () => {
      const program = Effect.Do()
        .bind("a", () =>
          Effect.service(NumberService).updateService(NumberService)(({ n }) => ({
            n: n + 1
          }))
        )
        .bind("b", () => Effect.service(NumberService))
        .provideEnvironment(NumberService.has({ n: 0 }))

      const { a, b } = await program.unsafeRunPromise()

      expect(a.n).toBe(1)
      expect(b.n).toBe(0)
    })
  })
})
