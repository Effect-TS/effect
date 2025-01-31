import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"

describe("optionalElement", () => {
  it("toString", () => {
    strictEqual(String(S.optionalElement(S.String)), "string?")
  })
})
