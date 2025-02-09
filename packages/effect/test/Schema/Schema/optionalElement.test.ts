import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("optionalElement", () => {
  it("toString", () => {
    expect(String(S.optionalElement(S.String))).toStrictEqual("string?")
  })
})
