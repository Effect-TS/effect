import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("optionalElement", () => {
  it("toString", () => {
    strictEqual(String(S.optionalElement(S.String)), "string?")
  })
})
