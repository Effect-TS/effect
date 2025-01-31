import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"

describe("SetFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.SetFromSelf(S.Number)), "Set<number>")
  })
})
