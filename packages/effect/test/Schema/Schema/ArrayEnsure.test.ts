import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("ArrayEnsure", () => {
  it("decode non-array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, "123", [123])
    await Util.assertions.decoding.fail(
      schema,
      null,
      `(NumberFromString | ReadonlyArray<NumberFromString> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | ReadonlyArray<NumberFromString>
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual null
      └─ Expected ReadonlyArray<NumberFromString>, actual null`
    )
  })

  it("decode empty array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, [], [])
  })

  it("decode array", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, ["123"], [123])
    await Util.assertions.decoding.fail(
      schema,
      [null],
      `(NumberFromString | ReadonlyArray<NumberFromString> <-> ReadonlyArray<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | ReadonlyArray<NumberFromString>
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual [null]
      └─ ReadonlyArray<NumberFromString>
         └─ [0]
            └─ NumberFromString
               └─ Encoded side transformation failure
                  └─ Expected string, actual null`
    )
  })

  it("encode", async () => {
    const schema = S.ArrayEnsure(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, [], [])
    await Util.assertions.encoding.succeed(schema, [123], "123")
    await Util.assertions.encoding.succeed(schema, [1, 2, 3], ["1", "2", "3"])
  })
})
