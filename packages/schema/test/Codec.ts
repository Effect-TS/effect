import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/Codec"
import * as D from "@fp-ts/schema/Decoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const codecFor = _.codecFor

describe("Codec", () => {
  it("exoprts", () => {
    expect(_.make).exist
    expect(_.filter).exist
    expect(_.filterWith).exist
    expect(_.refine).exist
    expect(_.string).exist
    expect(_.number).exist
    expect(_.boolean).exist
    expect(_.bigint).exist
    expect(_.unknown).exist
    expect(_.unknownArray).exist
    expect(_.unknownObject).exist
    expect(_.any).exist
    expect(_.never).exist
    expect(_.json).exist
    expect(_.jsonArray).exist
    expect(_.jsonObject).exist
  })

  it("literal", () => {
    const schema = S.literal(1)
    const codec = codecFor(schema)
    expect(codec.decode(1)).toEqual(D.success(1))
    Util.expectFailure(codec, "a", "\"a\" did not satisfy isEqual(1)")
  })

  it("string", () => {
    const decoder = D.decoderFor(S.string)
    expect(decoder.decode("a")).toEqual(D.success("a"))
    Util.expectFailure(decoder, 1, "1 did not satisfy is(string)")
  })

  it("Option", () => {
    const codec = _.option(_.number)
    expect(codec.decode(null)).toEqual(D.success(O.none))
    expect(codec.decode(1)).toEqual(D.success(O.some(1)))

    Util.expectFailure(
      codec,
      {},
      "member 0 {} did not satisfy isEqual(null), member 1 {} did not satisfy is(number)"
    )
    Util.expectWarning(
      codec,
      NaN,
      "did not satisfy not(isNaN)",
      O.some(NaN)
    )

    expect(codec.encode(O.none)).toEqual(null)
    expect(codec.encode(O.some(1))).toEqual(1)
  })

  it("parseOrThrow", () => {
    const Person = _.struct({
      firstName: _.string,
      lastName: _.string
    }, {
      age: _.number
    })

    const person = Person.of({ firstName: "Michael", lastName: "Arnaldi" })
    const string = Person.stringify(person)

    expect(string).toEqual(`{"firstName":"Michael","lastName":"Arnaldi"}`)
    expect(Person.parseOrThrow(string)).toEqual(person)
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => codecFor(schema)).toThrowError(
      new Error("Missing support for Decoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = codecFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))

      Util.expectFailure(decoder, {}, "{} did not satisfy is(ReadonlyArray<unknown>)")
      Util.expectFailure(decoder, ["a"], "/1 undefined did not satisfy is(number)")

      Util.expectWarning(decoder, ["a", NaN], "/1 did not satisfy not(isNaN)", ["a", NaN])
    })

    it("additional indexes should raise a warning", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = codecFor(schema)
      Util.expectWarning(decoder, ["a", 1, true], "/2 index is unexpected", ["a", 1])
    })
  })

  describe("struct", () => {
    it("should handle strings as keys", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = codecFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

      Util.expectFailure(
        decoder,
        null,
        "null did not satisfy is({ readonly [_: string]: unknown })"
      )
      Util.expectFailure(decoder, { a: "a", b: "a" }, "/b \"a\" did not satisfy is(number)")
      Util.expectFailure(decoder, { a: 1, b: "a" }, "/a 1 did not satisfy is(string)")

      Util.expectWarning(decoder, { a: "a", b: NaN }, "/b did not satisfy not(isNaN)", {
        a: "a",
        b: NaN
      })
    })

    it("additional fields should raise a warning", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = codecFor(schema)
      Util.expectWarning(decoder, { a: "a", b: 1, c: true }, "/c key is unexpected", {
        a: "a",
        b: 1
      })
    })

    it("should not fail on optional fields", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      const decoder = codecFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.number)
      const decoder = codecFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
      expect(decoder.decode({ a: 1 })).toEqual(D.success({ a: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is({ readonly [_: string]: unknown })")
      Util.expectFailure(decoder, { a: "a" }, "/a \"a\" did not satisfy is(number)")

      Util.expectWarning(decoder, { a: NaN }, "/a did not satisfy not(isNaN)", { a: NaN })
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.symbolIndexSignature(S.number)
      const decoder = codecFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
      expect(decoder.decode({ [a]: 1 })).toEqual(D.success({ [a]: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is({ readonly [_: string]: unknown })")
      Util.expectFailure(
        decoder,
        { [a]: "a" },
        "/Symbol(@fp-ts/schema/test/a) \"a\" did not satisfy is(number)"
      )

      Util.expectWarning(
        decoder,
        { [a]: NaN },
        "/Symbol(@fp-ts/schema/test/a) did not satisfy not(isNaN)",
        { [a]: NaN }
      )
    })
  })

  describe("union", () => {
    it("baseline", () => {
      const schema = S.union(S.string, S.number)
      const decoder = codecFor(schema)
      expect(decoder.decode("a")).toEqual(D.success("a"))
      expect(decoder.decode(1)).toEqual(D.success(1))

      Util.expectFailure(
        decoder,
        null,
        "member 0 null did not satisfy is(string), member 1 null did not satisfy is(number)"
      )
    })

    it("empty union", () => {
      const schema = S.union()
      const decoder = codecFor(schema)
      Util.expectFailure(decoder, 1, "1 did not satisfy is(never)")
    })
  })

  describe("array", () => {
    it("baseline", () => {
      const schema = S.array(S.string)
      const decoder = codecFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode(["a"])).toEqual(D.success(["a"]))

      Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
      Util.expectFailure(decoder, [1], "/0 1 did not satisfy is(string)")
    })

    it("using both", () => {
      const schema = S.array(S.number)
      const decoder = codecFor(schema)

      Util.expectWarning(
        decoder,
        [1, NaN, 3],
        "/1 did not satisfy not(isNaN)",
        [1, NaN, 3]
      )
    })
  })

  it("lazy", () => {
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
    const decoder = codecFor(schema)
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.success({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.success({ a: "a1", as: [{ a: "a2", as: [] }] })
    )

    Util.expectFailure(
      decoder,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is({ readonly [_: string]: unknown })"
    )
  })

  it("rest", () => {
    const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
    const decoder = codecFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))
    expect(decoder.decode(["a", 1, true])).toEqual(D.success(["a", 1, true]))
    expect(decoder.decode(["a", 1, true, false])).toEqual(D.success(["a", 1, true, false]))

    Util.expectFailure(decoder, ["a", 1, true, "a", true], "/3 \"a\" did not satisfy is(boolean)")
  })

  it("extend stringIndexSignature", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.extend(S.stringIndexSignature(S.string))
    )
    const decoder = codecFor(schema)
    expect(decoder.decode({ a: "a" })).toEqual(D.success({ a: "a" }))
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.success({ a: "a", b: "b" }))

    Util.expectFailure(decoder, {}, "/a undefined did not satisfy is(string)")
    Util.expectFailure(decoder, { b: "b" }, "/a undefined did not satisfy is(string)")
    Util.expectFailure(decoder, { a: 1 }, "/a 1 did not satisfy is(string)")
    Util.expectFailure(decoder, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)")
  })
})
