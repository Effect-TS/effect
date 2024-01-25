import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > decodeUnknownOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.decodeUnknownOption(Util.effectify(S.string))("a"))
  })
})
