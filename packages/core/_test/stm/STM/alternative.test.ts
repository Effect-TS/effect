import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("orElse", () => {
    it("tries alternative once left retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.retry)
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(200)
    })

    it("tries alternative once left fails", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.fail("boom"))
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(200)
    })

    it("fail if alternative fails", async () => {
      const program = (STM.fail("left") | STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("right"))
    })
  })

  describe("orElseEither", () => {
    it("returns result of the first successful transaction wrapped in either", async () => {
      const program = Effect.struct({
        rightValue: STM.retry.orElseEither(STM.succeed(42)).commit(),
        leftValue1: STM.succeed(1).orElseEither(STM.succeed("nope")).commit(),
        leftValue2: STM.succeed(2).orElseEither(STM.retry).commit()
      })

      const { leftValue1, leftValue2, rightValue } = await program.unsafeRunPromise()

      expect(rightValue).toEqual(Either.right(42))
      expect(leftValue1).toEqual(Either.left(1))
      expect(leftValue2).toEqual(Either.left(2))
    })
  })

  describe("orElseFail", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseFail(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("fails with the specified error once left retries", async () => {
      const program = STM.retry.orElseFail(false).either().commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(false))
    })

    it("fails with the specified error once left fails", async () => {
      const program = STM.fail(true).orElseFail(false).either().commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(false))
    })
  })

  describe("orElseSucceed", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("succeeds with the specified value if left retries", async () => {
      const program = STM.retry.orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("succeeds with the specified value if left fails", async () => {
      const program = STM.fail(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("alternative", () => {
    it("succeeds if left succeeds", async () => {
      const program = STM.succeed("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("left")
    })

    it("succeeds if right succeeds", async () => {
      const program = STM.retry.orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("right")
    })

    it("retries left after right retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) =>
          tRef.get().flatMap((n) => STM.check(n > 500).as("left"))
        )
        .bindValue("right", () => STM.retry)
        .bindValue("updater", ({ tRef }) =>
          tRef
            .update((n) => n + 10)
            .commit()
            .forever()
        )
        .flatMap(({ left, right, updater }) => left.orTry(right).commit().race(updater))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("left")
    })

    it("fails if left fails", async () => {
      const program = STM.fail("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("left"))
    })

    it("fails if right fails", async () => {
      const program = STM.retry.orTry(STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("right"))
    })
  })
})
