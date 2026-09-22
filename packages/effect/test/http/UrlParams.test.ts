import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Equal, Formatter, Hash, Redacted, Schema } from "effect"
import { UrlParams } from "effect/http"
import { assertSuccess } from "../utils/assert.ts"

describe("UrlParams", () => {
  describe("fromInput", () => {
    it("coerces null to a string", () => {
      deepStrictEqual(UrlParams.fromInput({ filter: null }).params, [["filter", "null"]])
    })

    it("sends Redacted values but hides them from inspection", () => {
      const params = UrlParams.fromInput({ remote: Redacted.make("param-secret"), q: "visible" })
      assert.strictEqual(UrlParams.toString(params), "remote=param-secret&q=visible")
      const output = Formatter.format(params)
      assertFalse(output.includes("param-secret"))
      assertTrue(output.includes("visible"))
    })
  })

  describe("transform", () => {
    it("preserves redaction when rebuilding pairs", () => {
      const params = UrlParams.transform(
        UrlParams.fromInput({ remote: Redacted.make("param-secret") }),
        (pairs) => pairs.map(([key, value]) => [key, value])
      )
      assert.strictEqual(UrlParams.toString(params), "remote=param-secret")
      assertFalse(Formatter.format(params).includes("param-secret"))
    })
  })

  describe("comma-separated arrays", () => {
    const make = () => UrlParams.fromInput({ tags: ["a,b", "c"] }, { arrayFormat: "comma" })

    it("encodes elements before delimiters and exposes decoded values", () => {
      const params = make()
      assert.strictEqual(UrlParams.toString(params), "tags=a%2Cb,c")
      deepStrictEqual([...params], [["tags", "a,b,c"]])
      deepStrictEqual(UrlParams.getAll(params, "tags"), ["a,b,c"])
      deepStrictEqual(UrlParams.toRecord(params), { tags: "a,b,c" })
      assert.strictEqual(UrlParams.toString(UrlParams.fromInput([...params])), "tags=a%2Cb,c")
    })

    it("handles empty arrays, nulls, false, zero and nested records", () => {
      const params = UrlParams.fromInput({
        empty: [],
        missing: [undefined],
        values: [0, false, null, undefined, ""],
        filter: { tags: ["a,b", "c"] }
      }, { arrayFormat: "comma" })
      assert.strictEqual(UrlParams.toString(params), "values=0,false,null,&filter%5Btags%5D=a%2Cb,c")
      assert.strictEqual(UrlParams.toString(UrlParams.fromInput({ tags: ["a", "b"] })), "tags=a&tags=b")
    })

    it("preserves encoding through append and set operations", () => {
      const original = make()
      assert.strictEqual(UrlParams.toString(UrlParams.append(original, "page", 1)), "tags=a%2Cb,c&page=1")
      assert.strictEqual(UrlParams.toString(UrlParams.appendAll(original, make())), "tags=a%2Cb,c&tags=a%2Cb,c")
      assert.strictEqual(UrlParams.toString(UrlParams.set(original, "page", 1)), "tags=a%2Cb,c&page=1")
      assert.strictEqual(UrlParams.toString(UrlParams.setAll(original, { page: 1 })), "page=1&tags=a%2Cb,c")
      assert.strictEqual(
        UrlParams.toString(UrlParams.setAll(UrlParams.fromInput({ page: 1 }), original)),
        "tags=a%2Cb,c&page=1"
      )
      assert.strictEqual(UrlParams.toString(original), "tags=a%2Cb,c")
    })

    it("discards array encoding when replacing, removing or rebuilding a value", () => {
      const params = make()
      assert.strictEqual(UrlParams.toString(UrlParams.set(params, "tags", "x,y")), "tags=x%2Cy")
      assert.strictEqual(UrlParams.toString(UrlParams.setAll(params, { tags: "x,y" })), "tags=x%2Cy")
      assert.strictEqual(UrlParams.toString(UrlParams.remove(params, "tags")), "")
      assert.strictEqual(
        UrlParams.toString(UrlParams.transform(params, (pairs) => pairs.map(([key, value]) => [key, value]))),
        "tags=a%2Cb%2Cc"
      )
    })

    it("distinguishes different encoded arrays in equivalence", () => {
      const a = make()
      const b = make()
      const c = UrlParams.fromInput({ tags: ["a", "b", "c"] }, { arrayFormat: "comma" })
      assert.isTrue(Equal.equals(a, b))
      assert.strictEqual(Hash.hash(a), Hash.hash(b))
      assert.isFalse(Equal.equals(a, c))
      assert.isFalse(Equal.equals(a, UrlParams.fromInput({ tags: "a,b,c" })))
      assert.isTrue(Equal.equals(
        UrlParams.fromInput({ tags: ["a"] }, { arrayFormat: "comma" }),
        UrlParams.fromInput({ tags: "a" })
      ))
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

  describe("redactUrl", () => {
    it.each([
      {
        url: "https://api.test/path?sig=secret&page=1#sig=fragment",
        names: undefined,
        expected: "https://api.test/path?sig=REDACTED&page=1#sig=fragment"
      },
      {
        url: "/path?%73ig=a&Sig=b&sig&page=1",
        names: undefined,
        expected: "/path?%73ig=REDACTED&Sig=REDACTED&sig&page=1"
      },
      { url: "/path/@user?page=a@b", names: undefined, expected: "/path/@user?page=a@b" },
      {
        url: "https://user:password@api.test/path",
        names: undefined,
        expected: "https://REDACTED:REDACTED@api.test/path"
      },
      {
        url: "https://user:password@api.test/path?sig=secret",
        names: [],
        expected: "https://REDACTED:REDACTED@api.test/path?sig=secret"
      },
      {
        url: " https://user:password@api.test/path",
        names: undefined,
        expected: " https://REDACTED:REDACTED@api.test/path"
      },
      {
        url: "https:////user:password@api.test/path",
        names: [],
        expected: "https:////REDACTED:REDACTED@api.test/path"
      },
      {
        url: "ht\ttps:\n//user:password@api.test/path",
        names: undefined,
        expected: "ht\ttps:\n//REDACTED:REDACTED@api.test/path"
      },
      { url: "https:/\\user:password@api.test/path", names: [], expected: "https:/\\REDACTED:REDACTED@api.test/path" }
    ])("redacts $url", ({ expected, names, url }) => {
      assert.strictEqual(UrlParams.redactUrl(url, names), expected)
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
