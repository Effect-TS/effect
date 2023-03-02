import * as S from "@effect/schema"

describe.concurrent("index", () => {
  it("exports", () => {
    expect(S.asserts).exist
  })
})
