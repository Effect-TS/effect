import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("ArrayEnsure", () => {
  it("annotations()", () => {
    const schema = S.ArrayEnsure(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    deepStrictEqual(schema.ast.annotations, {
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("decode non-array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, "123", [123])
    await Util.assertions.decoding.fail(
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

  it("decode empty array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, [], [])
  })

  it("decode array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, ["123"], [123])
    await Util.assertions.decoding.fail(
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

  it("encode", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, [], [])
    await Util.assertions.encoding.succeed(schema, [123], "123")
    await Util.assertions.encoding.succeed(schema, [1, 2, 3], ["1", "2", "3"])
  })
})
