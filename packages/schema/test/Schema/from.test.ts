import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/from", () => {
  it("suspend", async () => {
    interface I {
      prop: I | string
    }
    interface A {
      prop: A | number
    }
    const schema1: S.Schema<never, I, A> = S.struct({
      prop: S.union(S.NumberFromString, S.suspend(() => schema1))
    })
    const from1 = S.from(schema1)
    await Util.expectDecodeUnknownSuccess(from1, { prop: "a" })
    await Util.expectDecodeUnknownSuccess(from1, { prop: { prop: "a" } })

    const schema2: S.Schema<never, I, A> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          prop: S.union(S.NumberFromString, schema1)
        })
    )
    const from2 = S.from(schema2)
    await Util.expectDecodeUnknownSuccess(from2, { prop: "a" })
    await Util.expectDecodeUnknownSuccess(from2, { prop: { prop: "a" } })
  })

  it("decoding", async () => {
    const schema = S.from(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownFailure(schema, null, "Expected a string, actual null")
    await Util.expectDecodeUnknownFailure(schema, 1, "Expected a string, actual 1")
  })
})
