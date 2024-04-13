import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > partial", () => {
  describe("{ exact: false }", () => {
    it("struct", () => {
      // type A = { readonly a: string }
      // type B = Partial<A>
      const schema = S.partial(S.Struct({ a: S.String }))
      const expected = S.Struct({ a: S.optional(S.String) })
      expect(schema.ast).toStrictEqual(expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [],
          true
        )
        expect(AST.partial(tuple)).toEqual(
          new AST.TupleType([new AST.Element(AST.orUndefined(AST.stringKeyword), true)], [], true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [AST.numberKeyword],
          true
        )
        expect(AST.partial(tuple)).toEqual(
          new AST.TupleType(
            [new AST.Element(AST.orUndefined(AST.stringKeyword), true)],
            [AST.orUndefined(AST.numberKeyword)],
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [AST.numberKeyword, AST.booleanKeyword],
          true
        )
        expect(AST.partial(tuple)).toEqual(
          new AST.TupleType(
            [new AST.Element(AST.orUndefined(AST.stringKeyword), true)],
            [
              AST.Union.make([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])
            ],
            true
          )
        )
      })
    })
  })

  describe("{ exact: true }", () => {
    it("struct", () => {
      // type A = { readonly a: string }
      // type B = Partial<A>
      const schema = S.partial(S.Struct({ a: S.String }), { exact: true })
      const expected = S.Struct({ a: S.optional(S.String, { exact: true }) })
      expect(schema.ast).toStrictEqual(expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [],
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          new AST.TupleType([new AST.Element(AST.stringKeyword, true)], [], true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [AST.numberKeyword],
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          new AST.TupleType(
            [new AST.Element(AST.stringKeyword, true)],
            [AST.orUndefined(AST.numberKeyword)],
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.Element(AST.stringKeyword, false)],
          [AST.numberKeyword, AST.booleanKeyword],
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          new AST.TupleType(
            [new AST.Element(AST.stringKeyword, true)],
            [
              AST.Union.make([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])
            ],
            true
          )
        )
      })
    })
  })
})
