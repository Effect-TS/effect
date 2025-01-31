import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import { strictEqual } from "effect/test/util"

describe("MapFromSelf", () => {
  it("description", () => {
    strictEqual(String(S.MapFromSelf({ key: S.String, value: S.Number })), "Map<string, number>")
  })
})
