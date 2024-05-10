import * as S from "@effect/schema/Schema"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("Map", () => {
  it("description", () => {
    expect(String(S.Map({ key: S.String, value: S.Number }))).toStrictEqual(
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})
