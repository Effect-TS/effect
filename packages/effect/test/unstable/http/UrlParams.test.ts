import { assert, describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import { Schema } from "effect"
import { UrlParams } from "effect/unstable/http"
import { assertSuccess } from "../../utils/assert.ts"

describe("UrlParams", () => {
  describe("fromInput", () => {
    it("coerces scalar null in a record to a string", () => {
      assert.strictEqual(UrlParams.toString(UrlParams.fromInput({ filter: null })), "filter=null")
    })

    it("coerces scalar null in iterable pairs to a string", () => {
      assert.strictEqual(UrlParams.toString(UrlParams.fromInput([["filter", null]])), "filter=null")
    })

    it("coerces scalar null in a nested record to a string", () => {
      assert.deepStrictEqual(UrlParams.fromInput({ filter: { value: null } }).params, [["filter[value]", "null"]])
    })

    it("coerces array-contained null to a string", () => {
      assert.strictEqual(UrlParams.toString(UrlParams.fromInput({ filter: [null] })), "filter=null")
    })

    it("preserves primitive coercion, nesting and undefined omission", () => {
      assert.deepStrictEqual(
        UrlParams.fromInput({
          text: "null",
          count: 0,
          enabled: false,
          empty: "",
          size: 1n,
          omitted: undefined,
          filter: { value: "active", omitted: undefined },
          tag: ["first", undefined, "last"]
        }).params,
        [
          ["text", "null"],
          ["count", "0"],
          ["enabled", "false"],
          ["empty", ""],
          ["size", "1"],
          ["filter[value]", "active"],
          ["tag", "first"],
          ["tag", "last"]
        ]
      )
    })
  })

  it("append coerces null to a string", () => {
    assert.strictEqual(UrlParams.toString(UrlParams.append(UrlParams.empty, "filter", null)), "filter=null")
  })

  describe("Schema.UrlParams", () => {
    it("round-trips ordered pairs with the serializer annotation", () => {
      const iso = Schema.toIso(Schema.UrlParams)
      const params = UrlParams.make([["a", "1"], ["b", "2"]])
      assertSuccess(iso.getResult(params), [["a", "1"], ["b", "2"]])
      assertSuccess(iso.replaceResult([["a", "1"], ["b", "3"]], params), UrlParams.make([["a", "1"], ["b", "3"]]))
    })
  })

  it("getFirst and getLast return Option", () => {
    const params = UrlParams.fromInput([[
      "foo",
      "a"
    ], [
      "foo",
      "b"
    ]])
    assertSome(UrlParams.getFirst(params, "foo"), "a")
    assertSome(UrlParams.getLast(params, "foo"), "b")
    assertNone(UrlParams.getFirst(params, "bar"))
    assertNone(UrlParams.getLast(params, "bar"))
  })

  it("JsonFromUrlParamsField applies a JSON reviver", () => {
    const schema = Schema.JsonFromUrlParamsField("json", {
      reviver: (key, value) => key === "value" ? "revived" : value
    }).pipe(Schema.decodeTo(Schema.Struct({ value: Schema.String })))

    deepStrictEqual(
      Schema.decodeSync(schema)(UrlParams.fromInput({ json: "{\"value\":\"original\"}" })),
      { value: "revived" }
    )
  })

  it("RecordFromUrlParams preserves single and repeated values", () => {
    const params = UrlParams.make([["a", "1"], ["a", "2"], ["b", "3"]])

    deepStrictEqual(Schema.decodeSync(Schema.RecordFromUrlParams)(params), {
      a: ["1", "2"],
      b: "3"
    })
    deepStrictEqual(
      Schema.encodeSync(Schema.RecordFromUrlParams)({ a: ["1", "2"], b: "3" }),
      params
    )
  })
})
