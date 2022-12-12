import { Effect } from "effect"

describe("effect", () => {
  it("basic usage", () =>
    Effect.unsafeRunPromise(Effect.gen(function*($) {
      const a = yield* $(Effect.succeed(2))
      const b = yield* $(Effect.succeed(3))
      const c = yield* $(Effect.sync(() => a + b))
      expect(c).toBe(5)
    })))
})
