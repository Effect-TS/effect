import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("Set", () => {
  it("description", () => {
    strictEqual(String(S.Set(S.Number)), "(ReadonlyArray<number> <-> Set<number>)")
  })
})
