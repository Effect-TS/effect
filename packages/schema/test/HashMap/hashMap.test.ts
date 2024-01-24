import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as HashMap from "effect/HashMap"
import { describe, it } from "vitest"

describe("HashMap > hashMap", () => {
  it("property tests", () => {
    Util.roundtrip(S.hashMap(S.number, S.string))
  })

  it("decoding", async () => {
    const schema = S.hashMap(S.number, S.string)
    await Util.expectDecodeUnknownSuccess(schema, [], HashMap.fromIterable([]))
    await Util.expectDecodeUnknownSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<readonly [number, string]> <-> HashMap<number, string>)
└─ From side transformation failure
   └─ Expected ReadonlyArray<readonly [number, string]>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [[1, "a"], [2, 1]],
      `(ReadonlyArray<readonly [number, string]> <-> HashMap<number, string>)
└─ From side transformation failure
   └─ ReadonlyArray<readonly [number, string]>
      └─ [1]
         └─ readonly [number, string]
            └─ [1]
               └─ Expected a string, actual 1`
    )
  })

  it("encoding", async () => {
    const schema = S.hashMap(S.number, S.string)
    await Util.expectEncodeSuccess(schema, HashMap.fromIterable([]), [])
    await Util.expectEncodeSuccess(schema, HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
