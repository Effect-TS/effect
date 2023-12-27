import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/never", () => {
  const schema = S.never
  it("decoding", async () => {
    await Util.expectParseFailure(schema, 1, "Expected never, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeFailure(schema, 1 as any as never, "Expected never, actual 1")
  })
})
