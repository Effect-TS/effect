import * as FiberId from "effect/FiberId"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("FiberId", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.FiberId)
  })

  it("decoding", async () => {
    const schema = S.FiberId

    await Util.assertions.decoding.succeed(schema, { _tag: "None" }, FiberId.none)
    await Util.assertions.decoding.succeed(
      schema,
      { _tag: "Runtime", id: 1, startTimeMillis: 100 },
      FiberId.runtime(1, 100)
    )
    await Util.assertions.decoding.succeed(
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
      └─ FiberIdCompositeEncoded
         └─ ["right"]
            └─ FiberIdEncoded
               └─ { readonly _tag: "None" | "Runtime" | "Composite" }
                  └─ ["_tag"]
                     └─ Expected "None" | "Runtime" | "Composite", actual "-"`
    )
  })
})
