import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("ReadonlySet", () => {
  it("property tests", () => {
    Util.roundtrip(S.ReadonlySet(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ReadonlySet(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, [], new Set([]))
    await Util.expectDecodeUnknownSuccess(schema, [1, 2, 3], new Set([1, 2, 3]))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<number> <-> ReadonlySet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [1, "a"],
      `(ReadonlyArray<number> <-> ReadonlySet<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<number>
      └─ [1]
         └─ Expected number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.ReadonlySet(S.Number)
    await Util.expectEncodeSuccess(schema, new Set(), [])
    await Util.expectEncodeSuccess(schema, new Set([1, 2, 3]), [1, 2, 3])
  })
})
