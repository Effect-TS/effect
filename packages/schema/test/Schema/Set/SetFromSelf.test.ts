import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("SetFromSelf", () => {
  it("description", () => {
    expect(String(S.SetFromSelf(S.Number))).toStrictEqual("Set<number>")
  })
})
