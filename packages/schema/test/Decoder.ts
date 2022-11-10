import * as DE from "@fp-ts/codec/DecodeError"
import * as _ from "@fp-ts/codec/Decoder"
import * as T from "@fp-ts/codec/internal/These"

describe("Decoder", () => {
  it("should allow for custom errrors", () => {
    interface SetError {
      readonly _tag: "SetError"
    }
    const setError: SetError = { _tag: "SetError" }
    const set = <E, A>(
      item: _.Decoder<unknown, E, A>
    ): _.Decoder<unknown, SetError | E, Set<A>> =>
      _.make((u) => {
        if (!(u instanceof Set)) {
          return _.fail<SetError | E>(setError)
        }
        const out: Set<unknown> = new Set()
        for (const v of u.values()) {
          const t = item.decode(v)
          if (T.isLeft(t)) {
            return T.left(t.left)
          }
          out.add(t.right)
        }
        return _.succeed(out as any)
      })
    const decoder = set(_.number)
    expect(decoder.decode(new Set())).toEqual(_.succeed(new Set()))
    expect(decoder.decode(new Set([1, 2, 3]))).toEqual(_.succeed(new Set([1, 2, 3])))

    expect(decoder.decode(null)).toEqual(_.fail(setError))
    expect(decoder.decode(new Set([1, "a", 3]))).toEqual(_.fail(DE.type("number", "a")))
  })

  it("string", () => {
    expect(_.string.decode("a")).toEqual(_.succeed("a"))

    expect(_.string.decode(1)).toEqual(_.fail(DE.type("string", 1)))
  })

  it("number", () => {
    expect(_.number.decode(1)).toEqual(_.succeed(1))

    expect(_.number.decode("a")).toEqual(_.fail(DE.type("number", "a")))
  })

  it("boolean", () => {
    expect(_.boolean.decode(true)).toEqual(_.succeed(true))
    expect(_.boolean.decode(false)).toEqual(_.succeed(false))

    expect(_.boolean.decode("a")).toEqual(_.fail(DE.type("boolean", "a")))
  })

  it("literal", () => {
    const decoder = _.literal(1)
    expect(decoder.decode(1)).toEqual(_.succeed(1))

    expect(decoder.decode("a")).toEqual(_.fail(DE.equal(1, "a")))
  })

  it("tuple", () => {
    const decoder = _.tuple(_.string, _.number)
    expect(decoder.decode(["a", 1])).toEqual(_.succeed(["a", 1]))

    expect(decoder.decode(["a"])).toEqual(_.fail(DE.type("number", undefined)))
  })

  it("readonlyArray", () => {
    const decoder = _.readonlyArray(_.string)
    expect(decoder.decode([])).toEqual(_.succeed([]))
    expect(decoder.decode(["a"])).toEqual(_.succeed(["a"]))

    expect(decoder.decode(null)).toEqual(_.fail(DE.type("Array", null)))
    expect(decoder.decode([1])).toEqual(_.fail(DE.type("string", 1)))
  })

  // TODO it("nonEmptyArray", () => {

  it("struct", () => {
    const decoder = _.struct({ a: _.string, b: _.number })
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(_.succeed({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(_.fail(DE.type("Object", null)))
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(_.fail(DE.type("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(_.fail(DE.type("string", 1)))
  })
})
