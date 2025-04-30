import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ReadonlySet", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ReadonlySet(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ReadonlySet(S.Number)
    await Util.assertions.decoding.succeed(schema, [], new Set([]))
    await Util.assertions.decoding.succeed(schema, [1, 2, 3], new Set([1, 2, 3]))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(ReadonlyArray<number> <-> ReadonlySet<number>)
└─ Encoded side transformation failure
   └─ Expected ReadonlyArray<number>, actual null`
    )
    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(schema, new Set(), [])
    await Util.assertions.encoding.succeed(schema, new Set([1, 2, 3]), [1, 2, 3])
  })
})
