import * as S from "effect/Schema"
import { deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("pick", () => {
  it("should work", () => {
    const schema = S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b")
    deepStrictEqual(schema.fields, { a: S.String, b: S.Number })
  })
})
