import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Map > map", () => {
  it("description", () => {
    expect(String(S.map({ key: S.string, value: S.number }))).toStrictEqual(
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})
