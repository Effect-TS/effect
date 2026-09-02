import { assert, describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import { Schema } from "effect"
import { UrlParams } from "effect/unstable/http"
import { assertSuccess } from "../../utils/assert.ts"

describe("UrlParams", () => {
  describe("fromInput", () => {
    it("coerces null to a string", () => {
      deepStrictEqual(UrlParams.fromInput({ filter: null }).params, [["filter", "null"]])
    })
  })

  describe("setAll", () => {
    it("does not mutate UrlParams overrides", () => {
      const params = UrlParams.fromInput({ page: 1 })
      const overrides = UrlParams.fromInput({ sort: "name" })

      const result = UrlParams.setAll(params, overrides)

      assert.strictEqual(UrlParams.toString(result), "sort=name&page=1")
      assert.strictEqual(UrlParams.toString(params), "page=1")
      assert.strictEqual(UrlParams.toString(overrides), "sort=name")
    })

    it("preserves unmentioned parameters when reusing UrlParams overrides", () => {
      const setOverrides = UrlParams.setAll(UrlParams.fromInput({ sort: "name" }))
      const first = setOverrides(UrlParams.fromInput({ page: 1 }))
      const second = setOverrides(UrlParams.fromInput({ page: 2 }))

      assert.strictEqual(UrlParams.toString(first), "sort=name&page=1")
      assert.strictEqual(UrlParams.toString(second), "sort=name&page=2")
    })

    it("preserves unmentioned parameters when reusing record overrides", () => {
      const overrides = { sort: "name" }
      const setOverrides = UrlParams.setAll(overrides)
      const first = setOverrides(UrlParams.fromInput({ page: 1 }))
      const second = setOverrides(UrlParams.fromInput({ page: 2 }))

      assert.strictEqual(UrlParams.toString(first), "sort=name&page=1")
      assert.strictEqual(UrlParams.toString(second), "sort=name&page=2")
      assert.deepStrictEqual(overrides, { sort: "name" })
    })

    it("replaces repeated keys without mutating fully overlapping overrides", () => {
      const params = UrlParams.fromInput({ sort: ["old", "older"] })
      const overrides = UrlParams.fromInput({ sort: ["name", "date"] })

      const result = UrlParams.setAll(params, overrides)

      assert.strictEqual(UrlParams.toString(result), "sort=name&sort=date")
      assert.strictEqual(UrlParams.toString(params), "sort=old&sort=older")
      assert.strictEqual(UrlParams.toString(overrides), "sort=name&sort=date")
    })
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
