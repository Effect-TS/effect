import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Duration from "effect/Duration"
import { describe, it } from "vitest"

describe("Schema > getNumberIndexedAccess", () => {
  it("tuple", async () => {
    const schema = S.getNumberIndexedAccess(S.tuple(S.NumberFromString, S.Duration))
    await Util.expectParseSuccess(schema, "1", 1)
    await Util.expectParseSuccess(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.expectEncodeSuccess(schema, 1, "1")
    await Util.expectEncodeSuccess(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("tuple with optional element", async () => {
    const schema = S.getNumberIndexedAccess(S.tuple(S.NumberFromString).pipe(S.optionalElement(S.Duration)))
    await Util.expectParseSuccess(schema, undefined)
    await Util.expectParseSuccess(schema, "1", 1)
    await Util.expectParseSuccess(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.expectEncodeSuccess(schema, undefined, undefined)
    await Util.expectEncodeSuccess(schema, 1, "1")
    await Util.expectEncodeSuccess(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("array", async () => {
    const schema = S.getNumberIndexedAccess(S.array(S.NumberFromString))
    await Util.expectParseSuccess(schema, "1", 1)
    await Util.expectEncodeSuccess(schema, 1, "1")
  })

  it("union", async () => {
    const schema = S.getNumberIndexedAccess(S.union(S.array(S.number), S.array(S.string)))
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, 1)
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
