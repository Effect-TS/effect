import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("Set", () => {
  it("description", () => {
    strictEqual(String(S.Set(S.Number)), "(ReadonlyArray<number> <-> Set<number>)")
  })
})
