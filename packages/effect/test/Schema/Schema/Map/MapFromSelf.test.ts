import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("MapFromSelf", () => {
  it("description", () => {
    expect(String(S.MapFromSelf({ key: S.String, value: S.Number }))).toStrictEqual("Map<string, number>")
  })
})
