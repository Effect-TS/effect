import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("MapFromSelf", () => {
  it("description", () => {
    expect(String(S.MapFromSelf({ key: S.String, value: S.Number }))).toStrictEqual("Map<string, number>")
  })
})
