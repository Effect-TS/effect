import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("MapFromRecord", () => {
  it("decoding", async () => {
    const schema = S.MapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    await Util.assertions.decoding.succeed(schema, {}, new Map())
    await Util.assertions.decoding.succeed(
      schema,
      { 1: "2", 3: "4", 5: "6" },
      new Map([[1, 2], [3, 4], [5, 6]])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(a record to be decoded into a Map <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ Expected a record to be decoded into a Map, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: "1" },
      `(a record to be decoded into a Map <-> Map<NumberFromString, number>)
└─ Type side transformation failure
   └─ Map<NumberFromString, number>
      └─ ReadonlyArray<readonly [NumberFromString, number]>
         └─ [0]
            └─ readonly [NumberFromString, number]
               └─ [0]
                  └─ NumberFromString
                     └─ Transformation process failure
                        └─ Unable to decode "a" into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      { 1: "a" },
      `(a record to be decoded into a Map <-> Map<NumberFromString, number>)
└─ Encoded side transformation failure
   └─ a record to be decoded into a Map
      └─ ["1"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.MapFromRecord({ key: S.NumberFromString, value: S.NumberFromString })
    await Util.assertions.encoding.succeed(schema, new Map(), {})
    await Util.assertions.encoding.succeed(schema, new Map([[1, 2], [3, 4], [5, 6]]), { 1: "2", 3: "4", 5: "6" })
  })
})
