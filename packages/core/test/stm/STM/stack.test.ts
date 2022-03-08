import { Option } from "../../../src/data/Option"
import type { IO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"
import { chain } from "./utils"

describe("STM", () => {
  describe("STM stack safety", () => {
    it("long alternative chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry.orTry(tRef.getAndUpdate((n) => n + 1)))
        )
        .flatMap((tRef) => tRef.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("long map chains", async () => {
      const program = chain(10000, (stm) => stm.map((n) => n + 1))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    test("long collect chains", async () => {
      const program = chain(10000, (stm) =>
        stm.continueOrRetry((n) => Option.some(n + 1))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long collectSTM chains", async () => {
      const program = chain(10000, (stm) =>
        stm.continueOrRetrySTM((n) => Option.some(STM.succeed(n + 1)))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long flatMap chains", async () => {
      const program = chain(10000, (stm) => stm.flatMap((n) => STM.succeed(n + 1)))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long fold chains", async () => {
      const program = chain(10000, (stm) =>
        stm.fold(
          () => 0,
          (n) => n + 1
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long foldSTM chains", async () => {
      const program = chain(10000, (stm) =>
        stm.foldSTM(
          () => STM.succeed(0),
          (n) => STM.succeed(n + 1)
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long mapError chains", async () => {
      function chainError(depth: number): IO<number, never> {
        return chainErrorLoop(depth, STM.fail(0))
      }

      function chainErrorLoop(
        n: number,
        acc: STM<unknown, number, never>
      ): IO<number, never> {
        return n <= 0
          ? acc.commit()
          : Effect.suspendSucceed(
              chainErrorLoop(
                n - 1,
                acc.mapError((n) => n + 1)
              )
            )
      }

      const program = chainError(10000)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(10000))
    })

    it("long orElse chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry | tRef.getAndUpdate((n) => n + 1))
        )
        .flatMap((tRef) => tRef.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("long provide chains", async () => {
      const program = chain(10000, (stm) => stm.provideEnvironment(0))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(0)
    })
  })
})
