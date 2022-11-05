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

  it("readonlyArray", () => {
    const decoder = D.readonlyArray(D.string)
    expect(decoder.decode([])).toEqual(D.succeed([]))
    expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))
    expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
  })
})
