import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Set", () => {
  it("description", () => {
    expect(String(S.Set(S.Number))).toStrictEqual("(ReadonlyArray<number> <-> Set<number>)")
  })
})
