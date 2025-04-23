import { describe, it } from "@effect/vitest"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"
import { assertNone } from "@effect/vitest/utils"

describe("decodeUnknownOption", () => {
  it("should return none on async", () => {
    assertNone(S.decodeUnknownOption(Util.AsyncString)("a"))
  })
})
