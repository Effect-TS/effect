import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/suspend", () => {
  describe("decoding", () => {
    it("baseline", async () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
      })

      await Util.expectParseSuccess(schema, { a: "a1", as: [] })
      await Util.expectParseSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a1" },
        `/as is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a1", as: [{ a: "a2", as: [1] }] },
        "/as /0 /as /0 Expected <anonymous type literal schema>, actual 1"
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

      const Expression: S.Schema<Expression> = S.struct({
        type: S.literal("expression"),
        value: S.union(S.number, S.suspend(() => Operation))
      })

      const Operation: S.Schema<Operation> = S.struct({
        type: S.literal("operation"),
        operator: S.union(S.literal("+"), S.literal("-")),
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

      await Util.expectParseSuccess(Operation, input)
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
      const schema: S.Schema<FromA, A> = S.struct({
        a: Util.NumberFromChar,
        as: S.array(S.suspend(() => schema))
      })
      await Util.expectEncodeSuccess(schema, { a: 1, as: [] }, { a: "1", as: [] })
      await Util.expectEncodeSuccess(schema, { a: 1, as: [{ a: 2, as: [] }] }, {
        a: "1",
        as: [{ a: "2", as: [] }]
      })
    })
  })
})
