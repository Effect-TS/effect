import * as S from "@fp-ts/schema"

describe.concurrent("index", () => {
  it("exports", () => {
    expect(S.asserts).exist
  })
})
