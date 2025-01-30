import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("optionalElement", () => {
  it("toString", () => {
    strictEqual(String(S.optionalElement(S.String)), "string?")
  })
})
