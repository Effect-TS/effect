import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("parallelErrors", () => {
    it("oneFailure", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.fail("error1").fork())
        .bind("f2", () => Effect.succeed("success1").fork())
        .flatMap(({ f1, f2 }) =>
          f1
            .zip(f2)
            .join()
            .parallelErrors()
            .flip()
            .map((chunk) => chunk.toArray())
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["error1"])
    })

    it("allFailures", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.fail("error1").fork())
        .bind("f2", () => Effect.fail("error2").fork())
        .flatMap(({ f1, f2 }) =>
          f1
            .zip(f2)
            .join()
            .parallelErrors()
            .flip()
            .map((chunk) => chunk.toArray())
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["error1", "error2"])
    })
  })
})
