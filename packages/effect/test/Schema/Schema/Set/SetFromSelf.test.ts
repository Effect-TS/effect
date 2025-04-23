import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "@effect/vitest/utils"

describe("SetFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.SetFromSelf(S.Number)), "Set<number>")
  })
})
