import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ReadonlyMap", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ReadonlyMap({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.ReadonlyMap({ key: S.Number, value: S.String })
    await Util.assertions.decoding.succeed(schema, [], new Map())
    await Util.assertions.decoding.succeed(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<readonly [number, string]> <-> ReadonlyMap<number, string>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<readonly [number, string]>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      [[1, "a"], [2, 1]],
      `(ReadonlyArray<readonly [number, string]> <-> ReadonlyMap<number, string>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<readonly [number, string]>
      └─ [1]
         └─ readonly [number, string]
            └─ [1]
               └─ Expected string, actual 1`
    )
  })

  it("encoding", async () => {
    const schema = S.ReadonlyMap({ key: S.Number, value: S.String })
    await Util.assertions.encoding.succeed(schema, new Map(), [])
    await Util.assertions.encoding.succeed(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
