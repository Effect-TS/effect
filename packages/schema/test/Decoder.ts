import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as _ from "@fp-ts/codec/Schema"

describe("Decoder", () => {
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

  it("literal", () => {
    const decoder = D.literal(1)
    expect(decoder.decode(1)).toEqual(D.succeed(1))
    expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
  })

  it("fromGenericArray (true)", () => {
    const decoder = D.fromGenericArray(D.string, true)
    expect(decoder.decode([])).toEqual(D.succeed([]))
    expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))
    expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("fromGenericArray (false)", () => {
    const decoder = D.fromGenericArray(D.string, false)
    expect(decoder.decode([])).toEqual(D.succeed([]))
    expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))
    expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("struct", () => {
    const decoder = D.struct({ a: D.string, b: D.number })
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.fail(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
  })
})
