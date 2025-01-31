import { describe, it } from "@effect/vitest"
import { Schema as S } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { assertNone } from "effect/test/util"

describe("encodeUnknownOption", () => {
  it("should return none on async", () => {
    assertNone(S.encodeUnknownOption(Util.AsyncString)("a"))
  })
})
