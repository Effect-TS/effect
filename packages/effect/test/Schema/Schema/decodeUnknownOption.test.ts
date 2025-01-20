import { Option, Schema as S } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("decodeUnknownOption", () => {
  it("should return none on async", () => {
    expect(S.decodeUnknownOption(Util.AsyncString)("a")).toStrictEqual(Option.none())
  })
})
