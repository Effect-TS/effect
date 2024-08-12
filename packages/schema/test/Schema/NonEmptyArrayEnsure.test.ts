import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"
import { expectDecodeUnknownFailure, expectDecodeUnknownSuccess, expectEncodeSuccess } from "../TestUtils.js"

describe("NonEmptyArrayEnsure", () => {
  it("annotations()", () => {
    const schema = S.NonEmptyArrayEnsure(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("decode non-array", () => {
    const schema = S.NonEmptyArrayEnsure(S.Number)
    expectDecodeUnknownSuccess(schema, 123, [123])
    expectDecodeUnknownFailure(
      schema,
      "123",
      `(number | readonly [number, ...number[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ number | readonly [number, ...number[]]
      ├─ Expected number, actual "123"
      └─ Expected readonly [number, ...number[]], actual "123"`
    )
  })

  it("decode empty array", () => {
    const schema = S.NonEmptyArrayEnsure(S.Number)
    expectDecodeUnknownFailure(
      schema,
      [],
      `(number | readonly [number, ...number[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ number | readonly [number, ...number[]]
      ├─ Expected number, actual []
      └─ readonly [number, ...number[]]
         └─ [0]
            └─ is missing`
    )
  })

  it("decode array", () => {
    const schema = S.NonEmptyArrayEnsure(S.Number)
    expectDecodeUnknownSuccess(schema, [123], [123])
    expectDecodeUnknownFailure(
      schema,
      ["123"],
      `(number | readonly [number, ...number[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ number | readonly [number, ...number[]]
      ├─ Expected number, actual ["123"]
      └─ readonly [number, ...number[]]
         └─ [0]
            └─ Expected number, actual "123"`
    )
  })

  it("encode", () => {
    const schema = S.NonEmptyArrayEnsure(S.Number)
    expectEncodeSuccess(schema, [123], 123)
    expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })
})
