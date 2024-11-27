import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("FormData", () => {
  const schema = S.FormData(S.Struct({
    prop1: S.NumberFromString
  }))

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(S.FormData(S.Struct({
      prop1: S.NumberFromString
    })))
  })

  it("decoding", async () => {
    const fd = new FormData()
    fd.append("prop1", "1")
    await Util.expectDecodeUnknownSuccess(
      schema,
      fd,
      { prop1: 1 }
    )

    const wrongFd = new FormData()
    wrongFd.append("prop1", "false")
    await Util.expectDecodeUnknownFailure(
      schema,
      wrongFd,
      `(FormData<{ readonly prop1: string }> <-> { readonly prop1: NumberFromString })
└─ Type side transformation failure
   └─ { readonly prop1: NumberFromString }
      └─ ["prop1"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "false"`
    )
  })

  it("encoding", async () => {
    const fd = new FormData()
    fd.append("prop1", "2")
    await Util.expectEncodeSuccess(
      schema,
      { prop1: 2 },
      fd
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty({ prop1: 108 })).toEqual("{ \"prop1\": 108 }")
  })
})
