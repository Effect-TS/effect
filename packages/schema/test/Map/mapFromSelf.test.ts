import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Map > mapFromSelf", () => {
  it("description", () => {
    expect(String(S.MapFromSelf({ key: S.String, value: S.Number }))).toStrictEqual("Map<string, number>")
  })
})
