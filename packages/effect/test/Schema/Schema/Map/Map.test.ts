import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "@effect/vitest/utils"

describe("Map", () => {
  it("description", () => {
    strictEqual(
      String(S.Map({ key: S.String, value: S.Number })),
      "(ReadonlyArray<readonly [string, number]> <-> Map<string, number>)"
    )
  })
})
