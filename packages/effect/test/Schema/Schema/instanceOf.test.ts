import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("instanceOf", () => {
  it("is", () => {
    const schema = S.instanceOf(Set)
    const is = P.is(schema)
    expect(is(new Set())).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is({})).toEqual(false)
  })

  it("annotations", () => {
    const schema = S.instanceOf(Set, { description: "my description" })
    expect(schema.ast.annotations[AST.DescriptionAnnotationId]).toEqual("my description")
    expect(schema.ast.annotations[S.InstanceOfSchemaId]).toEqual({ constructor: Set })
  })

  it("decoding", async () => {
    const schema = S.instanceOf(Set)
    await Util.expectDecodeUnknownSuccess(schema, new Set())
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `Expected Set, actual 1`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `Expected Set, actual {}`
    )
  })

  describe("pretty", () => {
    it("default", () => {
      const schema = S.instanceOf(Set)
      const pretty = Pretty.make(schema)
      expect(pretty(new Set())).toEqual("[object Set]")
    })

    it("override", () => {
      const schema = S.instanceOf(Set, {
        pretty: () => (set) => `new Set(${JSON.stringify(Array.from(set.values()))})`
      })
      const pretty = Pretty.make(schema)
      expect(pretty(new Set([1, 2, 3]))).toEqual("new Set([1,2,3])")
    })
  })
})
