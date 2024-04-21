import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Never", () => {
  const schema = S.Never
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(schema, 1, "Expected never, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeFailure(schema, 1 as any as never, "Expected never, actual 1")
  })
})
