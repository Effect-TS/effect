import * as E from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as set from "@fp-ts/schema/data/Set"
import * as S from "@fp-ts/schema/Schema"
import * as show from "@fp-ts/schema/Show"

const showFor = show.provideShowFor(set.Provider)

describe("Show", () => {
  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.struct({ c: S.number }) })
    expect(showFor(schema).show({ a: "a", b: { c: 1 } })).toEqual(
      "{\"a\":\"a\",\"b\":{\"c\":1}}"
    )
    const schema2 = pipe(schema, S.pick("b"))
    expect(showFor(schema2).show({ b: { c: 1 } })).toEqual(
      "{\"b\":{\"c\":1}}"
    )
  })

  describe("showFor", () => {
    it("declaration", () => {
      const schema = set.schema(S.string)
      expect(showFor(schema).show(new Set("a"))).toEqual(
        "Set([\"a\"])"
      )
    })

    it("recursive", () => {
      interface A {
        readonly a: string
        readonly as: Set<A>
      }
      const A: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: set.schema(A)
        })
      )
      expect(showFor(A).show({ a: "a", as: new Set() })).toEqual(
        "{\"a\":\"a\",\"as\":Set([])}"
      )
    })

    it("unknown", () => {
      const schema = S.unknown
      expect(showFor(schema).show("a")).toEqual(
        "<unknown>"
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

    it("of", () => {
      const schema = S.of(1)
      expect(showFor(schema).show(1)).toEqual(
        "1"
      )
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      expect(showFor(schema).show(["a", 1])).toEqual(
        "[\"a\",1]"
      )
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.string, S.number)
      expect(showFor(schema).show(["a", 1])).toEqual(
        "[\"a\",1]"
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
        "{\"a\":\"a\",\"b\":1}"
      )
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      expect(showFor(schema).show({ a: "a", b: "b" })).toEqual(
        "{\"a\":\"a\",\"b\":\"b\"}"
      )
    })

    it("array", () => {
      const schema = S.array(S.string)
      expect(showFor(schema).show(["a", "b"])).toEqual(
        "[\"a\",\"b\"]"
      )
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(2))
      expect(showFor(schema).show("a")).toEqual(
        "\"a\""
      )
    })

    it("option (as structure)", () => {
      const schema = S.option(S.number)
      const show = showFor(schema)
      expect(show.show(O.none)).toEqual(
        "{\"_tag\":\"None\"}"
      )
      expect(show.show(O.some(1))).toEqual(
        "{\"_tag\":\"Some\",\"value\":1}"
      )
    })

    it("either (as structure)", () => {
      const schema = S.either(S.string, S.number)
      const show = showFor(schema)
      expect(show.show(E.right(1))).toEqual(
        "{\"_tag\":\"Right\",\"right\":1}"
      )
      expect(show.show(E.left("e"))).toEqual(
        "{\"_tag\":\"Left\",\"left\":\"e\"}"
      )
    })
  })
})
