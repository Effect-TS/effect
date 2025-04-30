import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("SetFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.SetFromSelf(S.Number)), "Set<number>")
  })
})
