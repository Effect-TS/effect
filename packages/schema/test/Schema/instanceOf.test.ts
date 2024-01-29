import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > instanceOf", () => {
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
    expect(schema.ast.annotations[S.InstanceOfTypeId]).toEqual({ constructor: Set })
  })

  it("decoding", async () => {
    const schema = S.instanceOf(Set)
    await Util.expectDecodeUnknownSuccess(schema, new Set())
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `Expected an instance of Set, actual 1`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `Expected an instance of Set, actual {}`
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

  it("Custom message", async () => {
    const schema = S.instanceOf(Set, {
      message: () => "This is a custom message"
    })
    await Util.expectDecodeUnknownFailure(schema, 1, `This is a custom message`)
  })
})
