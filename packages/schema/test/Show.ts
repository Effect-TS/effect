import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import * as E from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const set = <A>(item: S.Schema<A>): S.Schema<Set<A>> => S.apply(SetSym, O.none, item)

const declarations = pipe(
  S.empty,
  S.add(SetSym, {
    showFor: <A>(show: Sh.Show<A>): Sh.Show<Set<A>> =>
      Sh.make((a) => `Set([${Array.from(a.values()).map(show.show).join(", ")}])`)
  })
)

describe("Show", () => {
  describe("showFor", () => {
    const showFor = Sh.showFor(declarations)

    it("declaration", () => {
      const schema = set(S.string)
      expect(showFor(schema).show(new Set("a"))).toEqual(
        "Set([\"a\"])"
      )
    })

    it("string", () => {
      const schema = S.string
      expect(showFor(schema).show("a")).toEqual(
        "\"a\""
      )
    })

    it("number", () => {
      const schema = S.number
      expect(showFor(schema).show(1)).toEqual(
        "1"
      )
    })

    it("boolean", () => {
      const schema = S.boolean
      expect(showFor(schema).show(true)).toEqual(
        "true"
      )
    })

    it("literal", () => {
      const schema = S.equal(1)
      expect(showFor(schema).show(1)).toEqual(
        "1"
      )
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      expect(showFor(schema).show(["a", 1])).toEqual(
        "[\"a\", 1]"
      )
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(true, S.string, S.number)
      expect(showFor(schema).show(["a", 1])).toEqual(
        "[\"a\", 1]"
      )
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const s = showFor(schema)
      expect(s.show("a")).toEqual(
        "\"a\""
      )
      expect(s.show(1)).toEqual(
        "1"
      )
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expect(showFor(schema).show({ a: "a", b: 1 })).toEqual(
        "{ a: \"a\", b: 1 }"
      )
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      expect(showFor(schema).show({ a: "a", b: "b" })).toEqual(
        "{ a: \"a\", b: \"b\" }"
      )
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      expect(showFor(schema).show(["a", "b"])).toEqual(
        "[\"a\", \"b\"]"
      )
    })

    it("refinement", () => {
      const schema = pipe(S.string, S.minLength(2))
      expect(showFor(schema).show("a")).toEqual(
        "\"a\""
      )
    })

    it("option (as structure)", () => {
      const schema = S.option(S.number)
      const show = showFor(schema)
      expect(show.show(O.none)).toEqual(
        "{ _tag: \"None\" }"
      )
      expect(show.show(O.some(1))).toEqual(
        "{ _tag: \"Some\", value: 1 }"
      )
    })

    it("either (as structure)", () => {
      const schema = S.either(S.string, S.number)
      const show = showFor(schema)
      expect(show.show(E.right(1))).toEqual(
        "{ _tag: \"Right\", right: 1 }"
      )
      expect(show.show(E.left("e"))).toEqual(
        "{ _tag: \"Left\", left: \"e\" }"
      )
    })
  })
})
