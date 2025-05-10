import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("suspend", () => {
  describe("toString", () => {
    it("outer suspend", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
      )
      strictEqual(String(schema), "<suspended schema>")
    })

    it("should handle before initialization error", () => {
      const schema = S.suspend(() => string)
      strictEqual(String(schema), "<suspended schema>")
      const string = S.String
    })
  })

  describe("decoding", () => {
    it("baseline", async () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = S.Struct({
        a: S.String,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
      })

      await Util.assertions.decoding.succeed(schema, { a: "a1", as: [] })
      await Util.assertions.decoding.succeed(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected { readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a1" },
        `{ readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a1", as: [{ a: "a2", as: [1] }] },
        `{ readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ ReadonlyArray<<suspended schema>>
      └─ [0]
         └─ { readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }
            └─ ["as"]
               └─ ReadonlyArray<<suspended schema>>
                  └─ [0]
                     └─ Expected { readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }, actual 1`
      )
    })

    it("mutually suspended", async () => {
      interface Expression {
        readonly type: "expression"
        readonly value: number | Operation
      }

      interface Operation {
        readonly type: "operation"
        readonly operator: "+" | "-"
        readonly left: Expression
        readonly right: Expression
      }

      const Expression = S.Struct({
        type: S.Literal("expression"),
        value: S.Union(S.Number, S.suspend((): S.Schema<Operation> => Operation))
      })

      const Operation = S.Struct({
        type: S.Literal("operation"),
        operator: S.Union(S.Literal("+"), S.Literal("-")),
        left: Expression,
        right: Expression
      })

      const input = {
        type: "operation",
        operator: "+",
        left: {
          type: "expression",
          value: {
            type: "operation",
            operator: "-",
            left: {
              type: "expression",
              value: 2
            },
            right: {
              type: "expression",
              value: 3
            }
          }
        },
        right: {
          type: "expression",
          value: 1
        }
      }

      await Util.assertions.decoding.succeed(Operation, input)
    })
  })

  describe("encoding", () => {
    it("suspend", async () => {
      interface A {
        readonly a: number
        readonly as: ReadonlyArray<A>
      }
      interface FromA {
        readonly a: string
        readonly as: ReadonlyArray<FromA>
      }
      const schema = S.Struct({
        a: Util.NumberFromChar,
        as: S.Array(S.suspend((): S.Schema<A, FromA> => schema))
      })
      await Util.assertions.encoding.succeed(schema, { a: 1, as: [] }, { a: "1", as: [] })
      await Util.assertions.encoding.succeed(schema, { a: 1, as: [{ a: 2, as: [] }] }, {
        a: "1",
        as: [{ a: "2", as: [] }]
      })
    })
  })
})
