import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as readonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as P from "@fp-ts/schema/Pretty"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

describe("Pretty", () => {
  it("PrettyId", () => {
    expect(P.PrettyId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => P.prettyFor(schema)).toThrowError(
      new Error("Missing support for Pretty compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("declaration", () => {
    const schema = readonlySet.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Set("a"))).toEqual(
      "new Set([\"a\"])"
    )
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({ a: "a", b: 1 })).toEqual(
        "{ \"a\": \"a\", \"b\": 1 }"
      )
    })

    it("empty", () => {
      const schema = S.struct({})
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({})).toEqual(
        "{}"
      )
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.string)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({ a: "a", b: "b" })).toEqual(
        "{ \"a\": \"a\", \"b\": \"b\" }"
      )
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.symbolIndexSignature(S.string)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({ [a]: "a" })).toEqual(
        "{ Symbol(@fp-ts/schema/test/a): \"a\" }"
      )
    })

    it("should not output optional fields", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({})).toEqual("{}")
      expect(pretty.pretty({ a: undefined })).toEqual("{ \"a\": undefined }")
    })
  })

  it("string", () => {
    const schema = S.string
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty("a")).toEqual(
      "\"a\""
    )
  })

  it("number", () => {
    const schema = S.number
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(1)).toEqual(
      "1"
    )
  })

  it("boolean", () => {
    const schema = S.boolean
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(true)).toEqual(
      "true"
    )
  })

  it("bigint", () => {
    const pretty = P.prettyFor(S.bigint)
    expect(pretty.pretty(1n)).toEqual("1n")
  })

  it("literal", () => {
    const schema = S.literal(null)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(null)).toEqual(
      "null"
    )
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty(["a", 1])).toEqual(
        "[\"a\", 1]"
      )
    })

    it("rest element", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty(["a", 1])).toEqual("[\"a\", 1]")
      expect(pretty.pretty(["a", 1, true])).toEqual("[\"a\", 1, true]")
    })

    it("array", () => {
      const schema = S.array(S.string)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty(["a", "b"])).toEqual(
        "[\"a\", \"b\"]"
      )
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty("a")).toEqual(
      "\"a\""
    )
    expect(pretty.pretty(1)).toEqual(
      "1"
    )
  })

  it("recursive", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlySet<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: readonlySet.schema(A)
      })
    )
    const pretty = P.prettyFor(A)
    expect(pretty.pretty({ a: "a", as: new Set() })).toEqual(
      "{ \"a\": \"a\", \"as\": new Set([]) }"
    )
  })

  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty({})).toEqual("{}")
      expect(pretty.pretty({ a: undefined })).toEqual("{ \"a\": undefined }")
      expect(pretty.pretty({ a: 1 })).toEqual("{ \"a\": 1 }")
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty([])).toEqual("[]")
      expect(pretty.pretty([undefined])).toEqual("[undefined]")
      expect(pretty.pretty(["a"])).toEqual("[\"a\"]")
      expect(pretty.pretty(["a", undefined])).toEqual("[\"a\", undefined]")
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty([])).toEqual("[]")
      expect(pretty.pretty([1])).toEqual("[1]")
      expect(pretty.pretty([1])).toEqual("[1]")
      expect(pretty.pretty([undefined])).toEqual("[undefined]")
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const pretty = P.prettyFor(schema)
      expect(pretty.pretty("a")).toEqual("\"a\"")
      expect(pretty.pretty([])).toEqual("[]")
      expect(pretty.pretty([1])).toEqual("[1]")
      expect(pretty.pretty([undefined])).toEqual("[undefined]")
    })
  })
})
