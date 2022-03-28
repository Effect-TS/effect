import { Fiber } from "../../../src/io/Fiber"
import { FiberId } from "../../../src/io/FiberId"
import { TraceElement } from "../../../src/io/TraceElement"

describe("Fiber", () => {
  describe("Fiber.join on interrupted Fiber", () => {
    it("is inner interruption", async () => {
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const program = Fiber.interruptAs(fiberId).join()

      const result = await program.unsafeRunPromiseExit()

      expect(result).toHaveProperty("cause.fiberId", fiberId)
    })
  })
})
