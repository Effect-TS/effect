import * as S from "@effect/schema/Schema"

describe.concurrent("pattern", () => {
  it("Guard", () => {
    const schema = S.string.pipe(S.pattern(/^abb+$/))
    const is = S.is(schema)
    expect(is("abb")).toEqual(true)
    expect(is("abbb")).toEqual(true)

    expect(is("ab")).toEqual(false)
    expect(is("a")).toEqual(false)
  })

  it("should reset lastIndex to 0 before each `test` call (#88)", () => {
    const regex = /^(A|B)$/g
    const schema: S.Schema<string> = S.string.pipe(S.pattern(regex))
    expect(S.decodeSync(schema)("A")).toEqual("A")
    expect(S.decodeSync(schema)("A")).toEqual("A")
  })
})
