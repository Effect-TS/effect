import { describe, it } from "@effect/vitest"
import { ParseResult, Schema } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("decodeUnknownPromise", () => {
  const schema = Schema.String

  it("should resolve", async () => {
    deepStrictEqual(await Schema.decodeUnknownPromise(schema)("a"), "a")
    deepStrictEqual(await ParseResult.decodeUnknownPromise(schema)("a"), "a")
  })

  it("should reject on invalid values", async () => {
    await Util.assertions.promise.fail(
      Schema.decodeUnknownPromise(schema)(null),
      `Expected string, actual null`
    )
  })
})
