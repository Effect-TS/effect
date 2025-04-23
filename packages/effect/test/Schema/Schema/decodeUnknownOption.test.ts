import { describe, it } from "@effect/vitest"
import { assertNone } from "@effect/vitest/utils"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("decodeUnknownOption", () => {
  it("should return none on async", () => {
    assertNone(S.decodeUnknownOption(Util.AsyncString)("a"))
  })
})
