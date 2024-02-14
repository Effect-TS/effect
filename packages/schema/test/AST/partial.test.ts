import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("AST > partial", () => {
  describe("{ exact: false }", () => {
    it("struct", () => {
      // type A = { readonly a: string }
      // type B = Partial<A>
      const schema = S.partial(S.struct({ a: S.string }))
      const expected = S.struct({ a: S.optional(S.string) })
      expect(schema.ast).toStrictEqual(expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.none(),
          true
        )
        expect(AST.partial(tuple)).toEqual(
          AST.createTuple([AST.createElement(AST.orUndefined(AST.stringKeyword), true)], Option.none(), true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.some([AST.numberKeyword]),
          true
        )
        expect(AST.partial(tuple)).toEqual(
          AST.createTuple(
            [AST.createElement(AST.orUndefined(AST.stringKeyword), true)],
            Option.some([AST.orUndefined(AST.numberKeyword)]),
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.some([AST.numberKeyword, AST.booleanKeyword]),
          true
        )
        expect(AST.partial(tuple)).toEqual(
          AST.createTuple(
            [AST.createElement(AST.orUndefined(AST.stringKeyword), true)],
            Option.some([
              AST.createUnion([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])
            ]),
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
      const schema = S.partial(S.struct({ a: S.string }), { exact: true })
      const expected = S.struct({ a: S.optional(S.string, { exact: true }) })
      expect(schema.ast).toStrictEqual(expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.none(),
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          AST.createTuple([AST.createElement(AST.stringKeyword, true)], Option.none(), true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.some([AST.numberKeyword]),
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          AST.createTuple(
            [AST.createElement(AST.stringKeyword, true)],
            Option.some([AST.orUndefined(AST.numberKeyword)]),
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = AST.createTuple(
          [AST.createElement(AST.stringKeyword, false)],
          Option.some([AST.numberKeyword, AST.booleanKeyword]),
          true
        )
        expect(AST.partial(tuple, { exact: true })).toEqual(
          AST.createTuple(
            [AST.createElement(AST.stringKeyword, true)],
            Option.some([
              AST.createUnion([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword])
            ]),
            true
          )
        )
      })
    })
  })
})
