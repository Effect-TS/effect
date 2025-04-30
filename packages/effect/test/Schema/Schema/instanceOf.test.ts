import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("instanceOf", () => {
  it("is", () => {
    const schema = S.instanceOf(Set)
    const is = P.is(schema)
    assertTrue(is(new Set()))
    assertFalse(is(1))
    assertFalse(is({}))
  })

  it("annotations", () => {
    const schema = S.instanceOf(Set, { description: "my description" })
    strictEqual(schema.ast.annotations[AST.DescriptionAnnotationId], "my description")
    deepStrictEqual(schema.ast.annotations[S.InstanceOfSchemaId], { constructor: Set })
  })

  it("decoding", async () => {
    const schema = S.instanceOf(Set)
    await Util.assertions.decoding.succeed(schema, new Set())
    await Util.assertions.decoding.fail(
      schema,
      1,
      `Expected Set, actual 1`
    )
    await Util.assertions.decoding.fail(
      schema,
      {},
      `Expected Set, actual {}`
    )
  })

  describe("pretty", () => {
    it("default", () => {
      const schema = S.instanceOf(Set)
      Util.assertions.pretty(schema, new Set(), "[object Set]")
    })

    it("override", () => {
      const schema = S.instanceOf(Set, {
        pretty: () => (set) => `new Set(${JSON.stringify(Array.from(set.values()))})`
      })
      Util.assertions.pretty(schema, new Set([1, 2, 3]), "new Set([1,2,3])")
    })
  })
})
