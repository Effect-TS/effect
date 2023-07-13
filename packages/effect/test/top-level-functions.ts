import { absurd, hole, identity, pipe, unsafeCoerce } from "effect"

describe("top level functions", () => {
  it("exports", () => {
    expect(absurd).exist
    expect(hole).exist
    expect(identity).exist
    expect(pipe).exist
    expect(unsafeCoerce).exist
  })
})
