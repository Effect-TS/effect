import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"

describe("Set", () => {
  it("description", () => {
    strictEqual(String(S.Set(S.Number)), "(ReadonlyArray<number> <-> Set<number>)")
  })
})
