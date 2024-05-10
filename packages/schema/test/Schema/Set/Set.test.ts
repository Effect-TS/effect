import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("Set", () => {
  it("description", () => {
    expect(String(S.Set(S.Number))).toStrictEqual("(ReadonlyArray<number> <-> Set<number>)")
  })
})
