import * as Json from "@effect/sql-trino/internal/json"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"

const parseOk = (text: string): Json.JsonValue => {
  const result = Json.parse(text)
  assert.isTrue(Result.isSuccess(result), text)
  return Result.getOrThrow(result)
}

describe("Json", () => {
  it("keeps the digits of numbers beyond 2^53", () => {
    const value = parseOk("[9007199254740993, -9223372036854775808, 1.50, 1e400]")
    assert.deepStrictEqual(
      Json.asArray(value)?.map((n) => n instanceof Json.JsonNumber ? n.source : n),
      ["9007199254740993", "-9223372036854775808", "1.50", "1e400"]
    )
  })

  it("reads every JSON form", () => {
    const value = parseOk(` { "a" : [true, false, null, "x\\u00e9\\n\\"", {}, []], "b": -0.5E-3 } `)
    assert.deepStrictEqual(Json.field(value, "a"), [true, false, null, "xé\n\"", {}, []])
    assert.strictEqual(Json.asNumber(Json.field(value, "b")), -0.0005)
    assert.strictEqual(Json.asString(Json.field(value, "a")), undefined)
    assert.isUndefined(Json.field(value, "missing"))
  })

  it("keeps __proto__ as an own property", () => {
    const value = parseOk(`{"__proto__": {"polluted": true}}`)
    assert.isTrue(Object.hasOwn(Json.asObject(value) ?? {}, "__proto__"))
    assert.strictEqual(Object.getPrototypeOf(value), Object.prototype)
    assert.deepStrictEqual(Json.field(value, "__proto__"), { polluted: true })
  })

  it("remembers the written order of object entries", () => {
    const value = Json.asObject(parseOk(`{"b": 1, "10": 2, "a": 3, "2": 4}`)) ?? {}
    assert.deepStrictEqual(Object.keys(value), ["2", "10", "b", "a"])
    assert.deepStrictEqual(Json.entries(value).map(([key]) => key), ["b", "10", "a", "2"])
  })

  it("does not read inherited properties", () => {
    assert.isUndefined(Json.field(parseOk("{}"), "toString"))
  })

  it("rejects malformed documents with an offset", () => {
    for (
      const [text, offset] of [["[1,", 3], ["{\"a\" 1}", 5], ["01", 1], ["[1] x", 4], ["\"abc", 4], ["-", 1]] as const
    ) {
      const result = Json.parse(text)
      assert.isTrue(Result.isFailure(result), text)
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "JsonParseError")
        assert.strictEqual(result.failure.offset, offset, text)
      }
    }
  })

  it("rejects raw control characters in strings", () => {
    assert.isTrue(Result.isFailure(Json.parse("\"a\nb\"")))
  })
})
