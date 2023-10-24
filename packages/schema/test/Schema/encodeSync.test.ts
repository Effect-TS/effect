import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

// raises an error while encoding from a number if the string is not a char
const NumberFromChar = S.string.pipe(S.length(1), S.numberFromString)

describe("Schema/encodeSync", () => {
  it("should raise an error for invalid values", () => {
    const schema = NumberFromChar
    expect(P.encodeSync(schema)(1)).toEqual("1")
    expect(() => P.encodeSync(schema)(10)).toThrow(
      new Error(`error(s) found
└─ Expected a character, actual "10"`)
    )
  })
})
