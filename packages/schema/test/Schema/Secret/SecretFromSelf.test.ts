import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Secret } from "effect"
import { describe, expect, it } from "vitest"

describe("SecretFromSelf", () => {
  const schema = S.SecretFromSelf(S.Struct({
    coord: S.Tuple(S.Number, S.String)
  }))

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", () => {
    Util.expectDecodeUnknownSuccess(
      schema,
      Secret.make({ coord: [23.33, "keep me safe"] as const }),
      Secret.make({ coord: [23.33, "keep me safe"] as const })
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Secret.make({ coord: [23.33, "keep me safe"] as const }),
      Secret.make({ coord: [23.33, "keep me safe"] as const })
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(Secret.make({ coord: [23.33, "keep me safe"] as const }))).toEqual(`Secret(<redacted>)`)
  })
})
