import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"

describe("omit", () => {
  it("should work", () => {
    const schema = S.Struct({ a: S.String, b: S.Number, c: S.Boolean }).omit("c")
    deepStrictEqual(schema.fields, { a: S.String, b: S.Number })
  })

  it("should preserve index signatures on Struct with optionalWith default", () => {
    const schema = S.Struct(
      { a: S.String, b: S.optionalWith(S.Number, { default: () => 0 }) },
      S.Record({ key: S.String, value: S.Boolean })
    )
    const plain = S.Struct(
      { a: S.String, b: S.Number },
      S.Record({ key: S.String, value: S.Boolean })
    )
    deepStrictEqual(schema.pipe(S.omit("a")).ast, plain.pipe(S.omit("a")).ast)
  })
})
