import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as _ from "@effect/schema/TreeFormatter"
import { describe, expect, it } from "vitest"

describe("formatExpected", () => {
  it("refinement", () => {
    const schema = S.string.pipe(S.minLength(2))
    expect(_.formatAST(schema.ast)).toEqual("a string at least 2 character(s) long")
  })

  it("union", () => {
    const schema = S.union(S.string, S.string.pipe(S.minLength(2)))
    expect(_.formatAST(schema.ast)).toEqual(
      "a string at least 2 character(s) long | string"
    )
  })

  it("suspend", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.tuple(S.number, S.union(schema, S.literal(null)))
    )
    expect(_.formatAST(schema.ast)).toEqual("<suspended schema>")
  })
})

describe("formatErrors", () => {
  it("forbidden", async () => {
    const schema = Util.effectify(S.struct({ a: S.string }), "all")
    expect(() => S.parseSync(schema)({ a: "a" })).toThrow(
      new Error(`{ a: string }
└─ ["a"]
   └─ is forbidden`)
    )
  })

  it("missing", async () => {
    const schema = S.struct({ a: S.string })
    await Util.expectParseFailure(
      schema,
      {},
      `{ a: string }
└─ ["a"]
   └─ is missing`
    )
  })

  it("excess property", async () => {
    const schema = S.struct({ a: S.string })
    await Util.expectParseFailure(
      schema,
      { a: "a", b: 1 },
      `{ a: string }
└─ ["b"]
   └─ is unexpected, expected "a"`,
      Util.onExcessPropertyError
    )
  })
})

describe("formatActual", () => {
  it("should handle unexpected errors", () => {
    const circular: any = { a: null }
    circular.a = circular
    expect(_.formatActual(circular)).toEqual("[object Object]")
  })

  it("should detect data types with a custom `toString` implementation", () => {
    const noToString = { a: 1 }
    expect(_.formatActual(noToString)).toEqual(`{"a":1}`)
    const ToString = Object.create({
      toString() {
        return "toString custom implementation"
      }
    })
    expect(_.formatActual(ToString)).toEqual("toString custom implementation")
    // should not detect arrays
    expect(_.formatActual([1, 2, 3])).toEqual("[1,2,3]")
  })
})
