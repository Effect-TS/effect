import { describe, it } from "@effect/vitest"
import * as E from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Either", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Either({ left: S.String, right: S.Number }))
  })

  it("decoding", async () => {
    const schema = S.Either({ left: S.String, right: S.NumberFromString })
    await Util.assertions.decoding.succeed(
      schema,
      JSON.parse(JSON.stringify(E.left("a"))),
      E.left("a")
    )
    await Util.assertions.decoding.succeed(
      schema,
      JSON.parse(JSON.stringify(E.right("1"))),
      E.right(1)
    )
  })

  it("encoding", async () => {
    const schema = S.Either({ left: S.String, right: S.NumberFromString })
    await Util.assertions.encoding.succeed(schema, E.left("a"), { _tag: "Left", left: "a" })
    await Util.assertions.encoding.succeed(schema, E.right(1), { _tag: "Right", right: "1" })
  })
})
