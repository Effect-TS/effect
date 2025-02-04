import { describe, it } from "@effect/vitest"
import { ParseResult, Schema } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("encodeUnknownPromise", () => {
  const schema = Schema.String

  it("should resolve", async () => {
    deepStrictEqual(await Schema.encodeUnknownPromise(schema)("a"), "a")
    deepStrictEqual(await ParseResult.encodeUnknownPromise(schema)("a"), "a")
  })

  it("should reject on invalid values", async () => {
    await Util.assertions.promise.fail(
      Schema.encodeUnknownPromise(schema)(null),
      `Expected string, actual null`
    )
  })
})
