import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("SetFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.SetFromSelf(S.Number)), "Set<number>")
  })
})
