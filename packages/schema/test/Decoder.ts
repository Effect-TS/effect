import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as T from "@fp-ts/codec/internal/These"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"

const nan: D.Decoder<unknown, number> = pipe(
  D.number,
  D.compose(D.make(S.of(NaN), (n) => Number.isNaN(n) ? T.both([DE.nan], n) : D.succeed(n)))
)

describe("Decoder", () => {
  describe("README", () => {
    it("Creating a simple string schema", () => {
      const mySchema = D.string
      expect(mySchema.decode("tuna")).toEqual(D.succeed("tuna"))
    })

    it("Creating an object schema", () => {
      const User = D.struct({
        username: D.string
      })
      expect(User.decode({ username: "Ludwig" })).toEqual(D.succeed({ username: "Ludwig" }))
      type User = S.Infer<typeof User>
    })

    it("Deriving a guard", () => {
      const User = D.struct({
        username: D.string
      })
      const guard = G.unsafeGuardFor(User)
      expect(guard.is({ username: "Ludwig" })).toEqual(true)
      type User = S.Infer<typeof User>
    })
  })

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

  it("string", () => {
    expect(D.string.decode("a")).toEqual(D.succeed("a"))

    expect(D.string.decode(1)).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("number", () => {
    expect(D.number.decode(1)).toEqual(D.succeed(1))

    expect(D.number.decode("a")).toEqual(D.fail(DE.notType("number", "a")))
  })

  it("boolean", () => {
    expect(D.boolean.decode(true)).toEqual(D.succeed(true))
    expect(D.boolean.decode(false)).toEqual(D.succeed(false))

    expect(D.boolean.decode("a")).toEqual(D.fail(DE.notType("boolean", "a")))
  })

  it("of", () => {
    const decoder = D.of(1)
    expect(decoder.decode(1)).toEqual(D.succeed(1))

    expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const decoder = D.tuple(D.string, D.number)
    expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

    expect(decoder.decode(["a"])).toEqual(D.fail(DE.notType("number", undefined)))
  })

  describe("array", () => {
    it("baseline", () => {
      const decoder = D.array(D.string)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))

      expect(decoder.decode(null)).toEqual(D.fail(DE.notType("Array", null)))
      expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("using both", () => {
      const decoder = D.array(nan)
      expect(decoder.decode([1, NaN, 3])).toEqual(T.both([DE.nan], [1, NaN, 3]))
    })
  })

  it("struct", () => {
    const decoder = D.struct({ a: D.string, b: D.number })
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(D.fail(DE.notType("Object", null)))
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.fail(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("indexSignature", () => {
    const decoder = D.indexSignature(D.string)
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.succeed({ a: "a", b: "b" }))

    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
    expect(decoder.decode({ a: "a", b: 2 })).toEqual(D.fail(DE.notType("string", 2)))
  })

  it("lazy", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const decoder: D.Decoder<unknown, A> = D.lazy<unknown, A>(() =>
      D.struct({
        a: D.string,
        as: D.array(decoder)
      })
    )
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.succeed({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.succeed({ a: "a1", as: [{ a: "a2", as: [] }] })
    )
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
      D.fail(DE.notType("Object", 1))
    )
  })

  describe("usafeDecoderFor", () => {
    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = D.unsafeDecoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

      expect(decoder.decode(null)).toEqual(D.fail(DE.notType("Object", null)))
      expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.fail(DE.notType("number", "a")))
      expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
    })
  })
})
