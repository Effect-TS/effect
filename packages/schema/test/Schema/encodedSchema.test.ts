import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("encodedSchema", () => {
  it("suspend", async () => {
    interface I {
      prop: I | string
    }
    interface A {
      prop: A | number
    }
    const schema1: S.Schema<A, I> = S.Struct({
      prop: S.Union(S.NumberFromString, S.suspend(() => schema1))
    })
    const from1 = S.encodedSchema(schema1)
    await Util.expectDecodeUnknownSuccess(from1, { prop: "a" })
    await Util.expectDecodeUnknownSuccess(from1, { prop: { prop: "a" } })

    const schema2: S.Schema<A, I> = S.suspend( // intended outer suspend
      () =>
        S.Struct({
          prop: S.Union(S.NumberFromString, schema1)
        })
    )
    const from2 = S.encodedSchema(schema2)
    await Util.expectDecodeUnknownSuccess(from2, { prop: "a" })
    await Util.expectDecodeUnknownSuccess(from2, { prop: { prop: "a" } })
  })

  it("decoding", async () => {
    const schema = S.encodedSchema(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownFailure(schema, null, "Expected a string, actual null")
    await Util.expectDecodeUnknownFailure(schema, 1, "Expected a string, actual 1")
  })
})
