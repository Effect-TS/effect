import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "@effect/vitest/utils"

describe("Set", () => {
  it("description", () => {
    strictEqual(String(S.Set(S.Number)), "(ReadonlyArray<number> <-> Set<number>)")
  })
})
