import { describe, it } from "@effect/vitest"
import * as HashMap from "effect/HashMap"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("HashMap", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.HashMap({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.HashMap({ key: S.Number, value: S.String })
    await Util.assertions.decoding.succeed(schema, [], HashMap.fromIterable([]))
    await Util.assertions.decoding.succeed(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<readonly [number, string]> <-> HashMap<number, string>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<readonly [number, string]>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      [[1, "a"], [2, 1]],
      `(ReadonlyArray<readonly [number, string]> <-> HashMap<number, string>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<readonly [number, string]>
      └─ [1]
         └─ readonly [number, string]
            └─ [1]
               └─ Expected string, actual 1`
    )
  })

  it("encoding", async () => {
    const schema = S.HashMap({ key: S.Number, value: S.String })
    await Util.assertions.encoding.succeed(schema, HashMap.fromIterable([]), [])
    await Util.assertions.encoding.succeed(schema, HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
