import { assert, describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual, doesNotThrow, strictEqual } from "@effect/vitest/utils"
import { Redacted, Schema } from "effect"
import { Headers } from "effect/unstable/http"
import { assertSuccess } from "../../utils/assert.ts"

describe("Headers", () => {
  describe("Schema.Headers", () => {
    it("serializer annotation", () => {
      const _Accept = Schema.toIso(Schema.Headers).at("Accept")
      const headers = Headers.fromRecordUnsafe({
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache"
      })
      assertSuccess(_Accept.getResult(headers), "application/json, text/plain, */*")
      assertSuccess(
        _Accept.replaceResult("application/json", headers),
        Headers.fromRecordUnsafe({
          "accept": "application/json",
          "cache-control": "no-cache"
        })
      )
    })
  })

  it("does not expose inspectable prototype methods during for..in iteration", () => {
    const headers = Headers.fromInput({ foo: "bar" })
    const keys: Array<string> = []

    for (const key in headers) {
      keys.push(key)
    }

    deepStrictEqual(keys, ["foo"])
  })

  it("remove", () => {
    const headers = Headers.fromInput({ foo: "bar", baz: "qux", hello: "world" })
    const result = Headers.remove(headers, "baz")
    deepStrictEqual({ ...result }, { foo: "bar", hello: "world" })
  })

  it("removeMany deletes multiple headers", () => {
    const headers = Headers.fromInput({ foo: "bar", baz: "qux", hello: "world" })
    const result = Headers.removeMany(headers, ["baz", "hello"])
    deepStrictEqual({ ...result }, { foo: "bar" })
  })

  it("removeMany normalizes keys to lowercase", () => {
    const headers = Headers.fromInput({ "Content-Type": "text/plain", "X-Custom": "value", keep: "me" })
    const result = Headers.removeMany(headers, ["Content-Type", "X-CUSTOM"])
    deepStrictEqual({ ...result }, { keep: "me" })
  })

  it("works with for..in based headers polyfills", () => {
    const effectHeaders = Headers.fromInput({ foo: "bar" })
    const nativeHeaders = new globalThis.Headers()

    doesNotThrow(() => {
      for (const key in effectHeaders) {
        nativeHeaders.append(key, effectHeaders[key])
      }
    })

    strictEqual(nativeHeaders.get("foo"), "bar")
  })

  it("get returns Option", () => {
    const headers = Headers.fromInput({ foo: "bar" })
    assertSome(Headers.get(headers, "foo"), "bar")
    assertNone(Headers.get(headers, "missing"))
  })

  describe("redact", () => {
    it("accepts frozen non-stateful patterns", () => {
      const pattern = Object.freeze(/^x-secret-/)
      const headers = Headers.fromInput({ "x-secret-one": "one" })
      assert.strictEqual(Redacted.isRedacted(Headers.redact(headers, pattern)["x-secret-one"]), true)
      assert.strictEqual(Headers.isRedactedName("x-secret-one", [pattern]), true)
    })

    it.each(["", "g", "y"])("matches independent header names with RegExp flags %j", (flags) => {
      const input: Record<string, string> = { "x-secret-one": "one", "x-secret-two": "two", "x-public": "ok" }
      const headers = Headers.fromInput(input)
      const result = Headers.redact(headers, new RegExp("^x-secret-", flags))

      assert.strictEqual(result["x-public"], "ok")
      assert.deepStrictEqual({ ...headers }, input)
      assert.deepStrictEqual([
        Redacted.isRedacted(result["x-secret-one"]),
        Redacted.isRedacted(result["x-secret-two"])
      ], [true, true])
    })

    it("preserves sticky matching at the start of a header name", () => {
      const headers = Headers.fromInput({ "x-secret-one": "one" })

      assert.strictEqual(Redacted.isRedacted(Headers.redact(headers, /secret/g)["x-secret-one"]), true)
      assert.strictEqual(Headers.redact(headers, /secret/y)["x-secret-one"], "one")
    })
  })

  describe("isRedactedName", () => {
    it.each(["", "g", "y"])("matches independent header names with RegExp flags %j", (flags) => {
      const patterns = [new RegExp("^x-secret-", flags)]

      assert.deepStrictEqual([
        Headers.isRedactedName("x-secret-one", patterns),
        Headers.isRedactedName("x-secret-two", patterns),
        Headers.isRedactedName("x-secret-one", patterns),
        Headers.isRedactedName("x-public", patterns)
      ], [true, true, true, false])
    })

    it("preserves sticky matching at the start of a header name", () => {
      assert.strictEqual(Headers.isRedactedName("x-secret-one", [/secret/g]), true)
      assert.strictEqual(Headers.isRedactedName("x-secret-one", [/secret/y]), false)
    })
  })
})
