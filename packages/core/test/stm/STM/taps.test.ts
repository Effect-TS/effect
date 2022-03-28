import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"
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

  describe("taps", () => {
    it("tap should apply the transactional function to the effect result while keeping the effect itself", async () => {
      const program = STM.Do()
        .bind("refA", () => TRef.make(10))
        .bind("refB", () => TRef.make(0))
        .bind("a", ({ refA, refB }) => refA.get().tap((n) => refB.set(n + 1)))
        .bind("b", ({ refB }) => refB.get())
        .commit()

      const { a, b } = await program.unsafeRunPromise()

      expect(a).toBe(10)
      expect(b).toBe(11)
    })

    // TODO: implement after TPromise
    it("tapBoth applies the success function to success values while keeping the effect intact", async () => {
      // val tx =
      //   for {
      //     tapSuccess    <- TPromise.make[Nothing, Int]
      //     tapError      <- TPromise.make[Nothing, String]
      //     succeededSTM   = ZSTM.succeed(42): STM[String, Int]
      //     result        <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a))
      //     tappedSuccess <- tapSuccess.await
      //   } yield (result, tappedSuccess)
      // assertM(tx.commit)(equalTo((42, 42)))
    })

    // TODO: implement after TPromise
    it("tapBoth applies the function to error and successful values while keeping the effect itself on error", async () => {
      // val tx =
      //   for {
      //     tapSuccess  <- TPromise.make[Nothing, Int]
      //     tapError    <- TPromise.make[Nothing, String]
      //     succeededSTM = ZSTM.fail("error"): STM[String, Int]
      //     result      <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a)).either
      //     tappedError <- tapError.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    })

    // TODO: implement after TPromise
    it("tapError should apply the transactional function to the error result while keeping the effect itself", async () => {
      // val tx =
      //   for {
      //     errorRef    <- TPromise.make[Nothing, String]
      //     failedStm    = ZSTM.fail("error") *> ZSTM.succeed(0)
      //     result      <- failedStm.tapError(e => errorRef.succeed(e)).either
      //     tappedError <- errorRef.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    })
  })
})
