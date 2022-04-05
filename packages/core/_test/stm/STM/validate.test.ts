import { List } from "../../../src/collection/immutable/List"
import { Exit } from "../../../src/io/Exit"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("validate", () => {
    it("returns all errors if never valid", async () => {
      const input = List.repeat(0, 10)
      const program = STM.validate(input, STM.failNow).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })

    it("accumulate errors and ignore successes", async () => {
      const input = List.range(0, 10)
      const program = STM.validate(input, (n) =>
        n % 2 === 0 ? STM.succeed(n) : STM.fail(n)
      ).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail([1, 3, 5, 7, 9]))
    })

    it("accumulate successes", async () => {
      const input = List.range(0, 10)
      const program = STM.validate(input, STM.succeedNow)
        .commit()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(input.toArray())
    })
  })

  describe("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const input = List.repeat(0, 10)
      const program = STM.validateFirst(input, STM.failNow)
        .commit()
        .mapError((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })

    it("runs sequentially and short circuits on first success validation", async () => {
      const input = List.range(1, 10)
      const program = STM.Do()
        .bind("counter", () => TRef.make(0))
        .bind("result", ({ counter }) =>
          STM.validateFirst(
            input,
            (n) =>
              counter.update((_) => _ + 1) > (n === 6 ? STM.succeed(n) : STM.fail(n))
          )
        )
        .bind("count", ({ counter }) => counter.get())
        .commit()

      const { count, result } = await program.unsafeRunPromise()

      expect(result).toBe(6)
      expect(count).toBe(6)
    })

    it("returns errors in correct order", async () => {
      const input = List(2, 4, 6, 3, 5, 6)
      const program = STM.validateFirst(input, STM.failNow)
        .commit()
        .mapError((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })
  })
})
