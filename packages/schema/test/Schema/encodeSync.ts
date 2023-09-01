import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

// raises an error while encoding from a number if the string is not a char
const NumberFromChar = S.string.pipe(S.length(1), S.numberFromString)

describe.concurrent("Schema/encodeSync", () => {
  it("should raise an error for invalid values", () => {
    const schema = NumberFromChar
    expect(P.encodeSync(schema)(1)).toEqual("1")
    expect(() => P.encodeSync(schema)(10)).toThrowError(
      new Error(`error(s) found
└─ Expected a character, actual "10"`)
    )
  })
})
