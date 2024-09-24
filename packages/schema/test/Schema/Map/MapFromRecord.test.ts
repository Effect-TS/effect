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
      `(a record that will be parsed into a Map <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ Expected a record that will be parsed into a Map, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "1" },
      `(a record that will be parsed into a Map <-> Map<NumberFromString, number>)
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
      `(a record that will be parsed into a Map <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ a record that will be parsed into a Map
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
