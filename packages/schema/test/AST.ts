import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/AST"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as S from "@fp-ts/schema/Schema"

describe("AST", () => {
  describe("union", () => {
    it("should give precedence to schemas containing more infos", () => {
      const a = S.struct({ a: S.string })
      const ab = S.struct({ a: S.string, b: S.number })
      const schema = S.union(a, ab)
      expect(schema.ast).toEqual({
        _tag: "Union",
        members: [ab.ast, a.ast]
      })
    })
  })

  describe("keyof", () => {
    it("anyKeyword", () => {
      // type Test = keyof any // string | number | symbol
      expect(_.keyof(S.any.ast)).toEqual(
        [_.stringKeyword, _.numberKeyword, _.symbolKeyword]
      )
    })

    it("unknownKeyword", () => {
      // type Test = keyof unknown // never
      expect(_.keyof(S.unknown.ast)).toEqual([])
    })

    it("neverKeyword", () => {
      // type Test = keyof never // never
      expect(_.keyof(S.never.ast)).toEqual(
        [_.stringKeyword, _.numberKeyword, _.symbolKeyword]
      )
    })

    it("stringKeyword", () => {
      // type Test = keyof string // number
      expect(_.keyof(S.string.ast)).toEqual([_.numberKeyword])
    })

    it("numberKeyword", () => {
      // type Test = keyof number // never
      expect(_.keyof(S.number.ast)).toEqual([])
    })

    it("booleanKeyword", () => {
      // type Test = keyof boolean // never
      expect(_.keyof(S.boolean.ast)).toEqual([])
    })

    it("symbolKeyword", () => {
      // type Test = keyof symbol // never
      expect(_.keyof(S.symbol.ast)).toEqual([])
    })

    it("bigIntKeyword", () => {
      // type Test = keyof bigint // never
      expect(_.keyof(S.bigint.ast)).toEqual([])
    })

    it("undefinedKeyword", () => {
      // type Test = keyof undefined // never
      expect(_.keyof(S.undefined.ast)).toEqual([])
    })

    it("literalType", () => {
      // type Test = keyof 1 // never
      expect(_.keyof(_.literalType(1))).toEqual([])
      // type Test = keyof 'a' // number
      expect(_.keyof(_.literalType("a"))).toEqual([_.numberKeyword])
      // type Test = keyof true // never
      expect(_.keyof(_.literalType(true))).toEqual([])
      // type Test = keyof null // never
      expect(_.keyof(_.literalType(null))).toEqual([])
      // type Test = keyof 2n // never
      expect(_.keyof(_.literalType(2n))).toEqual([])
    })

    it("TypeAliasDeclaration", () => {
      // type Test = keyof O.Option<number> // "_tag"
      expect(_.keyof(DataOption.schema(S.number).ast)).toEqual([_.propertyKeyType("_tag")])
    })

    it("tuple", () => {
      // type Test = keyof [] // never
      expect(_.keyof(S.tuple().ast)).toEqual([])
      // type Test = keyof [string, number] // '0' | '1'
      expect(_.keyof(S.tuple(S.string, S.number).ast)).toEqual([
        _.propertyKeyType("0"),
        _.propertyKeyType("1")
      ])
      // type Test = keyof [string, number, ...Array<boolean>] // '0' | '1' | number
      expect(_.keyof(pipe(S.tuple(S.string, S.number), S.rest(S.boolean)).ast)).toEqual([
        _.propertyKeyType("0"),
        _.propertyKeyType("1"),
        _.numberKeyword
      ])
    })

    it("struct", () => {
      // type Test = keyof {} // never
      expect(_.keyof(S.struct({}).ast)).toEqual([])
      // type Test = keyof { a: string, b: number } // 'a' | 'b'
      expect(_.keyof(S.struct({ a: S.string, b: S.number }).ast)).toEqual([
        _.propertyKeyType("a"),
        _.propertyKeyType("b")
      ])
      // type Test = keyof ({ a: string; b: string; [_: string]: string }) // string | number
      expect(
        _.keyof(
          pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.stringIndexSignature(S.string)))
            .ast
        )
      ).toEqual([_.stringKeyword, _.numberKeyword])

      const a = Symbol.for("@fp-ts/schema/test/a")
      // type Test = keyof { [a]: string } // typeof A
      expect(_.keyof(S.struct({ [a]: S.string }).ast)).toEqual([_.propertyKeyType(a)])
    })

    describe("union", () => {
      it("empty union", () => {
        const schema = S.union()
        expect(_.keyof(schema.ast)).toEqual(_.keyof(_.neverKeyword))
      })

      it("discriminated unions", () => {
        const schema = S.union(
          S.struct({ _tag: S.literal("A"), a: S.string }),
          S.struct({ _tag: S.literal("B"), b: S.number })
        )
        expect(_.keyof(schema.ast)).toEqual([_.propertyKeyType("_tag")])
      })
    })

    it("lazy", () => {
      // type Test = keyof A // 'a' | 'as'
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: S.array(schema)
        })
      )
      expect(_.keyof(schema.ast)).toEqual([_.propertyKeyType("a"), _.propertyKeyType("as")])
    })
  })

  describe("getFields", () => {
    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      expect(_.getFields(schema.ast)).toEqual([
        _.field(0, S.string.ast, false, true),
        _.field(1, S.number.ast, false, true)
      ])
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expect(_.getFields(schema.ast)).toEqual([
        _.field("a", S.string.ast, false, true),
        _.field("b", S.number.ast, false, true)
      ])
    })

    /*
    type U = {
      readonly a: string
      readonly b: number
      [_: string]: string | number
    } | {
      a?: boolean
      readonly c: Date
    }

    type P = Pick<U, "a">
    type O = Omit<U, "b">
    type K = keyof U
    */

    describe("union", () => {
      it("required fields", () => {
        const schema = S.union(
          S.struct({ a: S.string, b: S.number }),
          S.struct({ a: S.boolean, c: S.boolean })
        )
        expect(_.getFields(schema.ast)).toEqual([
          _.field("a", _.union([S.string.ast, S.boolean.ast]), false, true)
        ])
      })

      it("optional fields", () => {
        const schema = S.union(
          S.struct({ a: S.string, b: S.number }),
          S.struct({ c: S.boolean }, { a: S.boolean })
        )
        expect(_.getFields(schema.ast)).toEqual([
          _.field("a", _.union([S.string.ast, S.boolean.ast]), true, true)
        ])
      })
    })

    it("lazy", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const Category: S.Schema<Category> = S.lazy<Category>(
        () =>
          S.struct({
            name: S.string,
            categories: S.array(Category)
          })
      )
      expect(_.getFields(Category.ast)).toEqual([
        _.field("name", S.string.ast, false, true),
        _.field("categories", _.tuple([], O.some(Category.ast), true), false, true)
      ])
    })
  })
})
