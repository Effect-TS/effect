import * as DE from "@fp-ts/codec/DecodeError"
import * as _ from "@fp-ts/codec/Decoder"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"

describe("Decoder", () => {
  it("string", () => {
    expect(_.string.decode("a")).toEqual(_.succeed("a"))
    expect(_.string.decode(1)).toEqual(_.fail(DE.notType("string", 1)))
  })

  it("number", () => {
    expect(_.number.decode(1)).toEqual(_.succeed(1))
    expect(_.number.decode("a")).toEqual(_.fail(DE.notType("number", "a")))
  })

  it("boolean", () => {
    expect(_.boolean.decode(true)).toEqual(_.succeed(true))
    expect(_.boolean.decode(false)).toEqual(_.succeed(false))
    expect(_.boolean.decode("a")).toEqual(_.fail(DE.notType("boolean", "a")))
  })

  it("literal", () => {
    const decoder = _.literal(1)
    expect(decoder.decode(1)).toEqual(_.succeed(1))
    expect(decoder.decode("a")).toEqual(_.fail(DE.notEqual(1, "a")))
  })

  it("readonlyArray", () => {
    const decoder = _.readonlyArray(_.string)
    expect(decoder.decode([])).toEqual(_.succeed([]))
    expect(decoder.decode(["a"])).toEqual(_.succeed(["a"]))
    expect(decoder.decode([1])).toEqual(_.fail(DE.notType("string", 1)))
  })

  it("struct", () => {
    const decoder = _.struct({ a: _.string, b: _.number })
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(_.succeed({ a: "a", b: 1 }))
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(_.fail(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(_.fail(DE.notType("string", 1)))
  })

  describe("decoderFor", () => {
    const ctx = C.empty()

    const decoderFor = _.decoderFor(ctx)

    it("string", () => {
      const schema = S.string
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(_.succeed("a"))
      expect(decoder.decode(1)).toEqual(_.fail(DE.notType("string", 1)))
    })

    it("number", () => {
      const schema = S.number
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(_.succeed(1))
      expect(decoder.decode("a")).toEqual(_.fail(DE.notType("number", "a")))
    })

    it("boolean", () => {
      const schema = S.boolean
      const decoder = decoderFor(schema)
      expect(decoder.decode(true)).toEqual(_.succeed(true))
      expect(decoder.decode(false)).toEqual(_.succeed(false))
      expect(decoder.decode(1)).toEqual(_.fail(DE.notType("boolean", 1)))
    })

    it("literal", () => {
      const schema = S.literal(1)
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(_.succeed(1))
      expect(decoder.decode("a")).toEqual(_.fail(DE.notEqual(1, "a")))
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(_.succeed([]))
      expect(decoder.decode(["a"])).toEqual(_.succeed(["a"]))
      expect(decoder.decode(["a", 1])).toEqual(_.fail(DE.notType("string", 1)))
    })
  })
})
