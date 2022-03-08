import { STM } from "../../../src/stm/STM"
import { HasSTMEnv, STMEnv } from "./utils"

describe("STM", () => {
  describe("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .commit()
            .provideEnvironment(HasSTMEnv.has(env))
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(HasSTMEnv.has(env))
            .commit()
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })
})
