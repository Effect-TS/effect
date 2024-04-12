import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Duration from "effect/Duration"
import { describe, it } from "vitest"

describe("Schema > getNumberIndexedAccess", () => {
  it("tuple", async () => {
    const schema = S.NumberIndexedAccess(S.Tuple(S.NumberFromString, S.Duration))
    await Util.expectDecodeUnknownSuccess(schema, "1", 1)
    await Util.expectDecodeUnknownSuccess(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.expectEncodeSuccess(schema, 1, "1")
    await Util.expectEncodeSuccess(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("tuple with optional element", async () => {
    const schema = S.NumberIndexedAccess(S.Tuple(S.NumberFromString, S.optionalElement(S.Duration)))
    await Util.expectDecodeUnknownSuccess(schema, undefined)
    await Util.expectDecodeUnknownSuccess(schema, "1", 1)
    await Util.expectDecodeUnknownSuccess(schema, [1, 0], Duration.nanos(1000000000n))
    await Util.expectEncodeSuccess(schema, undefined, undefined)
    await Util.expectEncodeSuccess(schema, 1, "1")
    await Util.expectEncodeSuccess(schema, Duration.nanos(1000000000n), [1, 0])
  })

  it("array", async () => {
    const schema = S.NumberIndexedAccess(S.Array(S.NumberFromString))
    await Util.expectDecodeUnknownSuccess(schema, "1", 1)
    await Util.expectEncodeSuccess(schema, 1, "1")
  })

  it("union", async () => {
    const schema = S.NumberIndexedAccess(S.Union(S.Array(S.Number), S.Array(S.String)))
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
