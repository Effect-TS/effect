import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Set > set", () => {
  it("description", () => {
    expect(String(S.set(S.number))).toStrictEqual("(ReadonlyArray<number> <-> Set<number>)")
  })
})
