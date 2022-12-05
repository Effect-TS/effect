import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("UnknownDecoder", () => {
  it("UnknownDecoderId", () => {
    expect(UD.UnknownDecoderId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => UD.unknownDecoderFor(schema)).toThrowError(
      new Error("Missing support for UnknownDecoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("should allow custom errors", () => {
    const mystring = pipe(
      S.string,
      S.clone(Symbol.for("mystring"), {
        [UD.UnknownDecoderId]: () => mystringDecoder
      })
    )

    const mystringDecoder = D.make(
      mystring,
      (u) =>
        typeof u === "string" ?
          D.success(u) :
          D.failure(DE.custom("not a string", u))
    )

    const Person = S.struct({
      name: mystring,
      age: S.number
    })
    const decoder = UD.unknownDecoderFor(Person)

    expect(decoder.decode({ name: "name", age: 18 })).toEqual(D.success({ name: "name", age: 18 }))

    Util.expectFailure(
      decoder,
      { name: null, age: 18 },
      "/name null \"not a string\""
    )
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))

      Util.expectFailure(decoder, {}, "{} did not satisfy is(ReadonlyArray<unknown>)")
      Util.expectFailure(decoder, ["a"], "/1 undefined did not satisfy is(number)")

      Util.expectWarning(decoder, ["a", NaN], "/1 did not satisfy not(isNaN)", ["a", NaN])
    })

    it("additional indexes should raise a warning", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = UD.unknownDecoderFor(schema)
      Util.expectWarning(decoder, ["a", 1, true], "/2 index is unexpected", ["a", 1])
    })
  })

  describe("struct", () => {
    it("should handle strings as keys", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

      Util.expectFailure(
        decoder,
        null,
        "null did not satisfy is({ readonly [_: string]: unknown })"
      )
      Util.expectFailure(decoder, { a: "a", b: "a" }, "/b \"a\" did not satisfy is(number)")
      Util.expectFailure(decoder, { a: 1, b: "a" }, "/a 1 did not satisfy is(string)")
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.number })
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode({ [a]: 1 })).toEqual(D.success({ [a]: 1 }))

      Util.expectFailure(
        decoder,
        {},
        "/Symbol(@fp-ts/schema/test/a) undefined did not satisfy is(number)"
      )
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

    it("additional fields should raise a warning", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = UD.unknownDecoderFor(schema)
      Util.expectWarning(decoder, { a: "a", b: 1, c: true }, "/c key is unexpected", {
        a: "a",
        b: 1
      })
      const c = Symbol.for("@fp-ts/schema/test/c")
      Util.expectWarning(
        decoder,
        { a: "a", b: 1, [c]: true },
        "/Symbol(@fp-ts/schema/test/c) key is unexpected",
        {
          a: "a",
          b: 1
        }
      )
    })

    it("should not fail on optional fields", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = S.partial(S.struct({ a: S.string, [b]: S.number }))
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))

      const output1 = decoder.decode({ a: undefined })
      expect(output1).toEqual(D.success({ a: undefined }))
      expect(pipe(output1, T.map(I.getPropertyKeys))).toEqual(T.right(["a"]))

      const output2 = decoder.decode({ [b]: undefined })
      expect(output2).toStrictEqual(D.success({ [b]: undefined }))
      expect(pipe(output2, T.map(I.getPropertyKeys))).toEqual(T.right([b]))
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.number)
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
      expect(decoder.decode({ a: 1 })).toEqual(D.success({ a: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is({ readonly [_: string]: unknown })")
      Util.expectFailure(decoder, { a: "a" }, "/a \"a\" did not satisfy is(number)")

      Util.expectWarning(decoder, { a: NaN }, "/a did not satisfy not(isNaN)", { a: NaN })
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.symbolIndexSignature(S.number)
      const decoder = UD.unknownDecoderFor(schema)
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
      const decoder = UD.unknownDecoderFor(schema)
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
      const decoder = UD.unknownDecoderFor(schema)
      Util.expectFailure(decoder, 1, "1 did not satisfy is(never)")
    })
  })
})
