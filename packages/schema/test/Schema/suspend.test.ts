import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("suspend", () => {
  describe("decoding", () => {
    it("baseline", async () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.suspend(() => schema))
      })

      await Util.expectDecodeUnknownSuccess(schema, { a: "a1", as: [] })
      await Util.expectDecodeUnknownSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a: string; as: ReadonlyArray<<suspended schema>> }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a1" },
        `{ a: string; as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a1", as: [{ a: "a2", as: [1] }] },
        `{ a: string; as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ ReadonlyArray<<suspended schema>>
      └─ [0]
         └─ { a: string; as: ReadonlyArray<<suspended schema>> }
            └─ ["as"]
               └─ ReadonlyArray<<suspended schema>>
                  └─ [0]
                     └─ Expected { a: string; as: ReadonlyArray<<suspended schema>> }, actual 1`
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

      const Expression: S.Schema<Expression> = S.Struct({
        type: S.Literal("expression"),
        value: S.Union(S.Number, S.suspend(() => Operation))
      })

      const Operation: S.Schema<Operation> = S.Struct({
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

      await Util.expectDecodeUnknownSuccess(Operation, input)
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
      const schema: S.Schema<A, FromA> = S.Struct({
        a: Util.NumberFromChar,
        as: S.Array(S.suspend(() => schema))
      })
      await Util.expectEncodeSuccess(schema, { a: 1, as: [] }, { a: "1", as: [] })
      await Util.expectEncodeSuccess(schema, { a: 1, as: [{ a: 2, as: [] }] }, {
        a: "1",
        as: [{ a: "2", as: [] }]
      })
    })
  })
})
