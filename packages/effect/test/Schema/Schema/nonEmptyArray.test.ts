import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("nonEmptyArray", () => {
  it("should expose the value", () => {
    const schema = S.NonEmptyArray(S.String)
    strictEqual(schema.value, S.String)
  })
})
