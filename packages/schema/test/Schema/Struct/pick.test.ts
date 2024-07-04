import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("pick", () => {
  it("should work", () => {
    const schema = S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).pick("a", "b")
    expect(schema.fields).toStrictEqual({ a: S.String, b: S.Number })
  })
})
