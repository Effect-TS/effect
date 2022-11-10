import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as T from "@fp-ts/codec/internal/These"
import { pipe } from "@fp-ts/data/Function"

const nan: D.Decoder<unknown, DE.Type | DE.NaN, number> = pipe(
  D.number,
  D.compose(D.make((n) => Number.isNaN(n) ? T.both([DE.nan], n) : D.succeed(n)))
)

describe("Decoder", () => {
  it("compose", () => {
    expect(D.compose).exist
  })

  it("flatMap", () => {
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.right(2)))).toEqual(T.both(["e1"], 2))
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.left(["e2"])))).toEqual(T.left(["e1", "e2"]))
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.both(["e2"], 2)))).toEqual(
      T.both(["e1", "e2"], 2)
    )
  })

  it("should allow custom errors", () => {
    interface SetError {
      readonly _tag: "SetError"
    }
    const setError: SetError = { _tag: "SetError" }
    const set = <E, A>(
      item: D.Decoder<unknown, E, A>
    ): D.Decoder<unknown, SetError | E, Set<A>> =>
      D.make((u) => {
        if (!(u instanceof Set)) {
          return D.fail<SetError | E>(setError)
        }
        const out: Set<unknown> = new Set()
        for (const v of u.values()) {
          const t = item.decode(v)
          if (T.isLeft(t)) {
            return T.left(t.left)
          }
          out.add(t.right)
        }
        return D.succeed(out as any)
      })
    const decoder = set(D.number)
    expect(decoder.decode(new Set())).toEqual(D.succeed(new Set()))
    expect(decoder.decode(new Set([1, 2, 3]))).toEqual(D.succeed(new Set([1, 2, 3])))

    expect(decoder.decode(null)).toEqual(D.fail(setError))
    expect(decoder.decode(new Set([1, "a", 3]))).toEqual(D.fail(DE.type("number", "a")))
  })

  it("string", () => {
    expect(D.string.decode("a")).toEqual(D.succeed("a"))

    expect(D.string.decode(1)).toEqual(D.fail(DE.type("string", 1)))
  })

  it("number", () => {
    expect(D.number.decode(1)).toEqual(D.succeed(1))

    expect(D.number.decode("a")).toEqual(D.fail(DE.type("number", "a")))
  })

  it("boolean", () => {
    expect(D.boolean.decode(true)).toEqual(D.succeed(true))
    expect(D.boolean.decode(false)).toEqual(D.succeed(false))

    expect(D.boolean.decode("a")).toEqual(D.fail(DE.type("boolean", "a")))
  })

  it("literal", () => {
    const decoder = D.literal(1)
    expect(decoder.decode(1)).toEqual(D.succeed(1))

    expect(decoder.decode("a")).toEqual(D.fail(DE.equal(1, "a")))
  })

  it("tuple", () => {
    const decoder = D.tuple(D.string, D.number)
    expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

    expect(decoder.decode(["a"])).toEqual(D.fail(DE.type("number", undefined)))
  })

  describe("readonlyArray", () => {
    it("baseline", () => {
      const decoder = D.readonlyArray(D.string)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))

      expect(decoder.decode(null)).toEqual(D.fail(DE.type("Array", null)))
      expect(decoder.decode([1])).toEqual(D.fail(DE.type("string", 1)))
    })

    it("using both", () => {
      const decoder = D.readonlyArray(nan)
      expect(decoder.decode([1, NaN, 3])).toEqual(T.both([DE.nan], [1, NaN, 3]))
    })
  })

  it("struct", () => {
    const decoder = D.struct({ a: D.string, b: D.number })
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(D.fail(DE.type("Object", null)))
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.fail(DE.type("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.type("string", 1)))
  })

  it("indexSignature", () => {
    const decoder = D.indexSignature(D.string)
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.succeed({ a: "a", b: "b" }))

    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.type("string", 1)))
    expect(decoder.decode({ a: "a", b: 2 })).toEqual(D.fail(DE.type("string", 2)))
  })
})
