import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
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
    const schema = S.ArrayEnsure(S.NumberFromString)
    expectDecodeUnknownSuccess(schema, "123", [123])
    expectDecodeUnknownFailure(
      schema,
      null,
      `(NumberFromString | ReadonlyArray<NumberFromString> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | ReadonlyArray<NumberFromString>
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual null
      └─ Expected ReadonlyArray<NumberFromString>, actual null`
    )
  })

  it("decode empty array", () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    expectDecodeUnknownSuccess(schema, [], [])
  })

  it("decode array", () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    expectDecodeUnknownSuccess(schema, ["123"], [123])
    expectDecodeUnknownFailure(
      schema,
      [null],
      `(NumberFromString | ReadonlyArray<NumberFromString> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | ReadonlyArray<NumberFromString>
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual [null]
      └─ ReadonlyArray<NumberFromString>
         └─ [0]
            └─ NumberFromString
               └─ Encoded side transformation failure
                  └─ Expected string, actual null`
    )
  })

  it("encode", () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    expectEncodeSuccess(schema, [], [])
    expectEncodeSuccess(schema, [123], "123")
    expectEncodeSuccess(schema, [1, 2, 3], ["1", "2", "3"])
  })
})
