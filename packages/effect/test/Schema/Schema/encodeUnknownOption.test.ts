import { describe, it } from "@effect/vitest"
import { assertNone } from "@effect/vitest/utils"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("encodeUnknownOption", () => {
  it("should return none on async", () => {
    assertNone(S.encodeUnknownOption(Util.AsyncString)("a"))
  })
})
