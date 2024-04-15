import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Map > map", () => {
  it("description", () => {
    expect(String(S.Map({ key: S.String, value: S.Number }))).toStrictEqual(
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})
