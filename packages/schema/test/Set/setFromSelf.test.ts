import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Set > setFromSelf", () => {
  it("description", () => {
    expect(String(S.SetFromSelf(S.Number))).toStrictEqual("Set<number>")
  })
})
