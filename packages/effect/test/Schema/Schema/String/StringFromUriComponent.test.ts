import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("StringFromUriComponent", () => {
  const schema = S.StringFromUriComponent

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, "шеллы", "%D1%88%D0%B5%D0%BB%D0%BB%D1%8B")
    await Util.expectEncodeFailure(
      schema,
      "Hello\uD800",
      `StringFromUriComponent
└─ Transformation process failure
   └─ URI malformed`
    )
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "%D1%88%D0%B5%D0%BB%D0%BB%D1%8B", "шеллы")
    await Util.assertions.decoding.succeed(schema, "hello", "hello")
    await Util.assertions.decoding.succeed(schema, "hello%20world", "hello world")

    await Util.expectDecodeUnknownFailure(
      schema,
      "Hello%2world",
      `StringFromUriComponent
└─ Transformation process failure
   └─ URI malformed`
    )
  })
})
