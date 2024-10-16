import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("headOrElse", () => {
  it("decoding (without fallback)", async () => {
    const schema = S.headOrElse(S.Array(S.NumberFromString))
    await Util.expectDecodeUnknownSuccess(schema, ["1"], 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      [],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Transformation process failure
   └─ Expected (ReadonlyArray<NumberFromString> <-> number), actual []`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("decoding (with fallback)", async () => {
    const schema = S.headOrElse(S.Array(S.NumberFromString), () => 0)
    await Util.expectDecodeUnknownSuccess(schema, ["1"], 1)
    await Util.expectDecodeUnknownSuccess(schema, [], 0)
    await Util.expectDecodeUnknownFailure(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> number)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )

    const schema2 = S.Array(S.NumberFromString).pipe(S.headOrElse(() => 0))
    await Util.expectDecodeUnknownSuccess(schema2, ["1"], 1)
    await Util.expectDecodeUnknownSuccess(schema2, [], 0)
  })

  it("decoding (struct)", async () => {
    const schema = S.headOrElse(
      S.Array(
        S.Struct({
          id: S.String,
          data: S.parseJson()
        })
      )
    )
    await Util.expectDecodeUnknownSuccess(schema, [
      {
        id: "1",
        data: "{\"a\":\"a\"}"
      }
    ], { id: "1", data: { a: "a" } })
  })

  it("encoding", async () => {
    const schema = S.headOrElse(S.Array(S.Number))
    await Util.expectEncodeSuccess(schema, 1, [1])
  })
})
