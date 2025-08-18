import { describe, it, expect } from "vitest"
import * as Effect from "effect/Effect"
import { greet } from "../src/index.js"

describe("@effect-native/example", () => {
  it("greets with the provided name", () => {
    const result = Effect.runSync(greet("World"))
    expect(result).toBe("Hello World from @effect-native/example!")
  })
})