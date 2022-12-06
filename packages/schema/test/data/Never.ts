import * as Never from "@fp-ts/schema/data/Never"
import * as G from "@fp-ts/schema/Guard"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("Never", () => {
  const schema = Never.Schema

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(false)
  })

  it("UnknownDecoder", () => {
    const decoder = UD.unknownDecoderFor(schema)
    Util.expectFailure(decoder, 1, "1 did not satisfy is(never)")
  })
})
