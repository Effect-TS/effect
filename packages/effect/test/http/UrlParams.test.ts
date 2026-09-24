import { assert, describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import { Equal, Hash, Redacted, Schema } from "effect"
import { UrlParams } from "effect/http"
import { assertSuccess } from "../utils/assert.ts"

describe("UrlParams", () => {
  describe("fromInput", () => {
    it("preserves redacted values in records, arrays, nested records, and iterables", () => {
      const secret = Redacted.make("secret &+#/é")
      const params = UrlParams.fromInput({
        token: secret,
        repeated: ["public", secret, undefined],
        nested: { token: secret },
        omitted: undefined
      })
      deepStrictEqual(params.params, [
        ["token", secret],
        ["repeated", "public"],
        ["repeated", secret],
        ["nested[token]", secret]
      ])
      assert.strictEqual(UrlParams.fromInput(params), params)
      deepStrictEqual(UrlParams.fromInput(new Map([["token", secret]])).params, [["token", secret]])
      deepStrictEqual(Array.from(params), params.params)
      deepStrictEqual(JSON.parse(JSON.stringify(params)), {
        _id: "UrlParams",
        params: { token: "<redacted>", repeated: "<redacted>", "nested[token]": "<redacted>" }
      })
    })

    it("coerces null to a string", () => {
      deepStrictEqual(UrlParams.fromInput({ filter: null }).params, [["filter", "null"]])
    })

    it("preserves deep bracket paths, empty keys, and repeated values", () => {
      const secret = Redacted.make("secret")
      const params = UrlParams.fromInput({
        "": { token: secret },
        filter: { user: { roles: ["admin", secret, undefined], active: false, omitted: undefined } },
        empty: []
      })
      deepStrictEqual(params.params, [
        ["[token]", secret],
        ["filter[user][roles]", "admin"],
        ["filter[user][roles]", secret],
        ["filter[user][active]", "false"]
      ])
    })
  })

  it("preserves redaction through updates and removes it when replacing or removing a value", () => {
    const secret = Redacted.make("secret")
    const original = UrlParams.fromInput({ token: secret, page: 1 })
    const updated = original.pipe(
      UrlParams.set("other", secret),
      UrlParams.append("token", "public"),
      UrlParams.appendAll([["token", secret]]),
      UrlParams.setAll({ page: 2 }),
      UrlParams.transform((params) => params.slice())
    )
    deepStrictEqual(updated.params, [
      ["page", "2"],
      ["token", secret],
      ["other", secret],
      ["token", "public"],
      ["token", secret]
    ])
    deepStrictEqual(original.params, [["token", secret], ["page", "1"]])
    const replaced = updated.pipe(UrlParams.set("token", "visible"), UrlParams.remove("other"))
    deepStrictEqual(replaced.params, [["page", "2"], ["token", "visible"]])
    deepStrictEqual(UrlParams.setAll(original, { token: "visible" }).params, [["token", "visible"], ["page", "1"]])
  })

  it("unwraps redacted values in string getters and serializers", () => {
    const secret = Redacted.make("secret &+#/é")
    const params = UrlParams.make([["token", secret], ["token", "public"], ["last", secret]])
    assertSome(UrlParams.getFirst(params, "token"), Redacted.value(secret))
    assertSome(UrlParams.getLast(params, "last"), Redacted.value(secret))
    deepStrictEqual(UrlParams.getAll(params, "token"), [Redacted.value(secret), "public"])
    deepStrictEqual(UrlParams.toRecord(params), {
      token: [Redacted.value(secret), "public"],
      last: Redacted.value(secret)
    })
    assert.strictEqual(
      UrlParams.toString(params),
      "token=secret+%26%2B%23%2F%C3%A9&token=public&last=secret+%26%2B%23%2F%C3%A9"
    )
    assertSuccess(Schema.toIso(Schema.UrlParams).getResult(params), [
      ["token", Redacted.value(secret)],
      ["token", "public"],
      ["last", Redacted.value(secret)]
    ])
    deepStrictEqual(Schema.decodeSync(Schema.RecordFromUrlParams)(params), UrlParams.toRecord(params))
  })

  it("compares and hashes redacted values by their contents without equating them to plain strings", () => {
    const first = UrlParams.fromInput({ token: Redacted.make("secret") })
    const second = UrlParams.fromInput({ token: Redacted.make("secret") })
    assert.isTrue(UrlParams.Equivalence(first, second))
    assert.isTrue(Equal.equals(first, second))
    assert.strictEqual(Hash.hash(first), Hash.hash(second))
    assert.isFalse(UrlParams.Equivalence(first, UrlParams.fromInput({ token: "secret" })))
    assert.isFalse(UrlParams.Equivalence(first, UrlParams.fromInput({ token: Redacted.make("different") })))
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
