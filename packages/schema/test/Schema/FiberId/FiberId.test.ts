import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as FiberId from "effect/FiberId"
import { describe, it } from "vitest"

describe("FiberId", () => {
  it("property tests", () => {
    Util.roundtrip(S.FiberId)
  })

  it("decoding", async () => {
    const schema = S.FiberId

    await Util.expectDecodeUnknownSuccess(schema, { _tag: "None" }, FiberId.none)
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Runtime", id: 1, startTimeMillis: 100 },
      FiberId.runtime(1, 100)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Composite", left: { _tag: "None" }, right: { _tag: "None" } },
      FiberId.composite(FiberId.none, FiberId.none)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      { _tag: "Composite", left: { _tag: "None" }, right: { _tag: "-" } },
      `FiberId
└─ Encoded side transformation failure
   └─ FiberIdEncoded
      └─ Union member
         └─ FiberIdCompositeEncoded
            └─ ["right"]
               └─ FiberIdEncoded
                  └─ { _tag: "None" | "Runtime" | "Composite" }
                     └─ ["_tag"]
                        └─ Expected "None" | "Runtime" | "Composite", actual "-"`
    )
  })
})
