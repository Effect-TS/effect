import * as O from "@effect/data/Option"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

describe.concurrent("Schema/encodeOption", () => {
  it("should return none for invalid values", () => {
    const schema = S.string.pipe(S.maxLength(1), S.numberFromString)
    expect(P.encodeOption(schema)(1)).toEqual(O.some("1"))
    expect(P.encodeOption(schema)(10)).toEqual(O.none())
  })
})
