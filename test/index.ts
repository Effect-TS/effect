import { Effect, Schema } from "effect"

describe("exports", () => {
  it("Effect", () => {
    expect(Effect.succeed).exist
  })
  it("Schema", () => {
    expect(Schema.string).exist
  })
})
