import * as S from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("omit", () => {
  it("should work", () => {
    const schema = S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).omit("c")
    expect(schema.fields).toStrictEqual({ a: S.String, b: S.Number })
  })
})
