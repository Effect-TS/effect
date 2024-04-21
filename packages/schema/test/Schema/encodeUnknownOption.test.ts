import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("encodeUnknownOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.encodeUnknownOption(Util.AsyncString)("a"))
  })
})
