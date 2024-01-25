import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > encodeUnknownOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.encodeUnknownOption(Util.AsyncString)("a"))
  })
})
