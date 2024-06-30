import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("MapFromRecord", () => {
  it("decoding", async () => {
    const schema = S.MapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    await Util.expectDecodeUnknownSuccess(schema, {}, new Map())
    await Util.expectDecodeUnknownSuccess(
      schema,
      { 1: "2", 3: "4", 5: "6" },
      new Map([[1, 2], [3, 4], [5, 6]])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `({ readonly [x: string]: NumberFromString } <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ Expected { readonly [x: string]: NumberFromString }, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "1" },
      `({ readonly [x: string]: NumberFromString } <-> Map<NumberFromString, number>)
└─ Type side transformation failure
   └─ Map<NumberFromString, number>
      └─ ReadonlyArray<readonly [NumberFromString, number]>
         └─ [0]
            └─ readonly [NumberFromString, number]
               └─ [0]
                  └─ NumberFromString
                     └─ Transformation process failure
                        └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { 1: "a" },
      `({ readonly [x: string]: NumberFromString } <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ { readonly [x: string]: NumberFromString }
      └─ ["1"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.MapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    await Util.expectEncodeSuccess(schema, new Map(), {})
    await Util.expectEncodeSuccess(schema, new Map([[1, 2], [3, 4], [5, 6]]), { 1: "2", 3: "4", 5: "6" })
  })
})
