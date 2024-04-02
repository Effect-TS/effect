import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Set > setFromSelf", () => {
  it("description", () => {
    expect(String(S.setFromSelf(S.number))).toStrictEqual("Set<number>")
  })
})
