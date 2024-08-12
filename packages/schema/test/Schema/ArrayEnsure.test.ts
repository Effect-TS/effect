import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"
import { expectDecodeUnknownFailure, expectDecodeUnknownSuccess, expectEncodeSuccess } from "../TestUtils.js"

describe("ArrayEnsure", () => {
  it("annotations()", () => {
    const schema = S.ArrayEnsure(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("decode non-array", () => {
    const schema = S.ArrayEnsure(S.Number)
    expectDecodeUnknownSuccess(schema, 123, [123])
    expectDecodeUnknownFailure(
      schema,
      "123",
      `(number | ReadonlyArray<number> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ number | ReadonlyArray<number>
      ├─ Expected number, actual "123"
      └─ Expected ReadonlyArray<number>, actual "123"`
    )
  })

  it("decode empty array", () => {
    const schema = S.ArrayEnsure(S.Number)
    expectDecodeUnknownSuccess(schema, [], [])
  })

  it("decode array", () => {
    const schema = S.ArrayEnsure(S.Number)
    expectDecodeUnknownSuccess(schema, [123], [123])
    expectDecodeUnknownFailure(
      schema,
      ["123"],
      `(number | ReadonlyArray<number> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ number | ReadonlyArray<number>
      ├─ Expected number, actual ["123"]
      └─ ReadonlyArray<number>
         └─ [0]
            └─ Expected number, actual "123"`
    )
  })

  it("encode", () => {
    const schema = S.ArrayEnsure(S.Number)
    expectEncodeSuccess(schema, [123], 123)
    expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })
})
