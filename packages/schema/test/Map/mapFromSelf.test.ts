import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Map > mapFromSelf", () => {
  it("description", () => {
    expect(String(S.mapFromSelf({ key: S.string, value: S.number }))).toStrictEqual("Map<string, number>")
  })
})
