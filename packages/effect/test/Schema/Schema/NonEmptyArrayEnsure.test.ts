import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
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
    const schema = S.NonEmptyArrayEnsure(S.NumberFromString)
    expectDecodeUnknownSuccess(schema, "123", [123])
    expectDecodeUnknownFailure(
      schema,
      null,
      `(NumberFromString | readonly [NumberFromString, ...NumberFromString[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ NumberFromString | readonly [NumberFromString, ...NumberFromString[]]
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual null
      └─ Expected readonly [NumberFromString, ...NumberFromString[]], actual null`
    )
  })

  it("decode empty array", () => {
    const schema = S.NonEmptyArrayEnsure(S.NumberFromString)
    expectDecodeUnknownFailure(
      schema,
      [],
      `(NumberFromString | readonly [NumberFromString, ...NumberFromString[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ NumberFromString | readonly [NumberFromString, ...NumberFromString[]]
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual []
      └─ readonly [NumberFromString, ...NumberFromString[]]
         └─ [0]
            └─ is missing`
    )
  })

  it("decode array", () => {
    const schema = S.NonEmptyArrayEnsure(S.NumberFromString)
    expectDecodeUnknownSuccess(schema, ["123"], [123])
    expectDecodeUnknownFailure(
      schema,
      [null],
      `(NumberFromString | readonly [NumberFromString, ...NumberFromString[]] <-> readonly [number, ...number[]])
└─ Encoded side transformation failure
   └─ NumberFromString | readonly [NumberFromString, ...NumberFromString[]]
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual [null]
      └─ readonly [NumberFromString, ...NumberFromString[]]
         └─ [0]
            └─ NumberFromString
               └─ Encoded side transformation failure
                  └─ Expected string, actual null`
    )
  })

  it("encode", () => {
    const schema = S.NonEmptyArrayEnsure(S.NumberFromString)
    expectEncodeSuccess(schema, [123], "123")
    expectEncodeSuccess(schema, [1, 2, 3], ["1", "2", "3"])
  })
})
