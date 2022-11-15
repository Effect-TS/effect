import * as M from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import * as O from "@fp-ts/data/Option"

describe("Meta", () => {
  describe("getFields", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      expect(M.getFields(schema.meta)).toEqual([
        M.field("a", M.string({}), false, true),
        M.field("b", M.number({}), false, true)
      ])
    })

    /*
    type U = {
      readonly a: string
      readonly b: number
      [_: string]: unknown
    } | {
      readonly a: boolean
      readonly c: Date
    }

    type P = Pick<U, "a">
    type O = Omit<U, "b">
    type K = keyof U
    */

    it("union", () => {
      const schema = S.union(
        S.struct({
          a: S.string,
          b: S.number
        }),
        S.struct({
          a: S.boolean,
          c: S.number
        })
      )
      expect(M.getFields(schema.meta)).toEqual([
        M.field("a", M.union([M.string({}), M.boolean]), false, true)
      ])
    })

    it("lazy", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const Category: S.Schema<Category> = S.lazy<Category>(
        Symbol.for("Category"),
        () =>
          S.struct({
            name: S.string,
            categories: S.array(true, Category)
          })
      )
      expect(M.getFields(Category.meta)).toEqual([
        M.field("name", M.string({}), false, true),
        M.field("categories", M.tuple([], O.some(Category.meta), true), false, true)
      ])
    })
  })
})
