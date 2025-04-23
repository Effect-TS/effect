import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("partial", () => {
  describe("{ exact: false }", () => {
    it("struct", () => {
      // type A = { readonly a: string }
      // type B = Partial<A>
      const schema = S.partial(S.Struct({ a: S.String }))
      const expected = S.Struct({ a: S.optional(S.String) })
      deepStrictEqual(schema.ast, expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [],
          true
        )
        deepStrictEqual(
          AST.partial(tuple),
          new AST.TupleType([new AST.OptionalType(AST.orUndefined(AST.stringKeyword), true)], [], true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [new AST.Type(AST.numberKeyword)],
          true
        )
        deepStrictEqual(
          AST.partial(tuple),
          new AST.TupleType(
            [new AST.OptionalType(AST.orUndefined(AST.stringKeyword), true)],
            [new AST.Type(AST.orUndefined(AST.numberKeyword))],
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [new AST.Type(AST.numberKeyword), new AST.Type(AST.booleanKeyword)],
          true
        )
        deepStrictEqual(
          AST.partial(tuple),
          new AST.TupleType(
            [new AST.OptionalType(AST.orUndefined(AST.stringKeyword), true)],
            [
              new AST.Type(AST.Union.make([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword]))
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
      const schema = S.partialWith(S.Struct({ a: S.String }), { exact: true })
      const expected = S.Struct({ a: S.optionalWith(S.String, { exact: true }) })
      deepStrictEqual(schema.ast, expected.ast)
    })

    describe("tuple", () => {
      it("e", () => {
        // type A = [string]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [],
          true
        )
        deepStrictEqual(
          AST.partial(tuple, { exact: true }),
          new AST.TupleType([new AST.OptionalType(AST.stringKeyword, true)], [], true)
        )
      })

      it("e + r", () => {
        // type A = readonly [string, ...Array<number>]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [new AST.Type(AST.numberKeyword)],
          true
        )
        deepStrictEqual(
          AST.partial(tuple, { exact: true }),
          new AST.TupleType(
            [new AST.OptionalType(AST.stringKeyword, true)],
            [new AST.Type(AST.orUndefined(AST.numberKeyword))],
            true
          )
        )
      })

      it("e + r + e", () => {
        // type A = readonly [string, ...Array<number>, boolean]
        // type B = Partial<A>
        const tuple = new AST.TupleType(
          [new AST.OptionalType(AST.stringKeyword, false)],
          [new AST.Type(AST.numberKeyword), new AST.Type(AST.booleanKeyword)],
          true
        )
        deepStrictEqual(
          AST.partial(tuple, { exact: true }),
          new AST.TupleType(
            [new AST.OptionalType(AST.stringKeyword, true)],
            [
              new AST.Type(AST.Union.make([AST.numberKeyword, AST.booleanKeyword, AST.undefinedKeyword]))
            ],
            true
          )
        )
      })
    })
  })
})
