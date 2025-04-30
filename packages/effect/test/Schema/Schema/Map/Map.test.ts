import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("Map", () => {
  it("description", () => {
    strictEqual(
      String(S.Map({ key: S.String, value: S.Number })),
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})
