import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("encodeUnknownOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.encodeUnknownOption(Util.AsyncString)("a"))
  })
})
