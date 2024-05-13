import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("SetFromSelf", () => {
  it("description", () => {
    expect(String(S.SetFromSelf(S.Number))).toStrictEqual("Set<number>")
  })
})
