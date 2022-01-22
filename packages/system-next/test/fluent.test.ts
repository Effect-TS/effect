import { Effect } from "../src/Effect"

describe("Effect Fluent API", () => {
  it("should succeed in using the fluent api", async () => {
    const result = await Effect.succeed(0)
      .map((n) => n + 1)
      .unsafeRunPromise()

    expect(result).toEqual(1)
  })
})
