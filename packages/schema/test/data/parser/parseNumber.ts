import { parseNumber } from "@fp-ts/schema/data/parser"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("parseNumber", () => {
  const schema = parseNumber(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)
    expect(decoder.decode("1")).toEqual(DE.success(1))
    expect(decoder.decode("1a")).toEqual(DE.success(1))
    Util.expectDecodingFailure(
      decoder,
      "a",
      `"a" did not satisfy parsing from (string) to (number)`
    )
    Util.expectDecodingFailure(
      decoder,
      "a1",
      `"a1" did not satisfy parsing from (string) to (number)`
    )
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, 1, "1")
  })

  it("example", () => {
    const schema = parseNumber(S.string) // converts string schema to number schema
    const decoder = D.decoderFor(schema)

    // success cases
    expect(decoder.decode("1")).toEqual(DE.success(1))
    expect(decoder.decode("-1")).toEqual(DE.success(-1))
    expect(decoder.decode("1.5")).toEqual(DE.success(1.5))
    expect(decoder.decode("NaN")).toEqual(DE.success(NaN))
    expect(decoder.decode("Infinity")).toEqual(DE.success(Infinity))
    expect(decoder.decode("-Infinity")).toEqual(DE.success(-Infinity))

    // failure cases
    expect(decoder.decode("a")).toEqual(
      DE.failure(DE.transform("string", "number", "a"))
    )
  })
})
