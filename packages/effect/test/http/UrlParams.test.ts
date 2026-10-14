import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Formatter, Schema } from "effect"
import { UrlParams } from "effect/http"
import { assertSuccess } from "../utils/assert.ts"

describe("UrlParams", () => {
  describe("fromInput", () => {
    it("coerces null to a string", () => {
      deepStrictEqual(UrlParams.fromInput({ filter: null }).params, [["filter", "null"]])
    })
  })

  describe("setAll", () => {
    it("does not retain parameters when reusing UrlParams overrides", () => {
      const overrides = UrlParams.fromInput({ sort: "name" })

      UrlParams.setAll(UrlParams.fromInput({ page: 1 }), overrides)
      assert.strictEqual(
        UrlParams.toString(UrlParams.setAll(UrlParams.fromInput({ page: 2 }), overrides)),
        "sort=name&page=2"
      )
    })
  })

  describe("CurrentRedactedNames", () => {
    it.effect("replaces the default names when provided", () =>
      Effect.gen(function*() {
        const output = Formatter.format(UrlParams.fromInput({ token: "token-secret", sig: "sig-visible" }))
        assertFalse(output.includes("token-secret"))
        assertTrue(output.includes("sig-visible"))
      }).pipe(Effect.provideService(UrlParams.CurrentRedactedNames, ["token"])))
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
