import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("pick", () => {
  it("should work", () => {
    const schema = S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b")
    deepStrictEqual(schema.fields, { a: S.String, b: S.Number })
  })
})
