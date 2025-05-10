import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("MapFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.MapFromSelf({ key: S.String, value: S.Number })), "Map<string, number>")
  })
})
