import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("decodeUnknownOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.decodeUnknownOption(Util.AsyncString)("a"))
  })
})
