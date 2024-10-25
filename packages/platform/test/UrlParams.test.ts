import * as UrlParams from "@effect/platform/UrlParams"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"

describe("UrlParams", () => {
  describe("makeUrl", () => {
    it.effect("makes a URL", () =>
      Effect.gen(function*(_) {
        const url = yield* _(UrlParams.makeUrl("https://example.com/test", [], Option.none()))
        assert.strictEqual(url.toString(), "https://example.com/test")
      }))

    it.effect("supports relative URLs", () =>
      Effect.gen(function*(_) {
        const originalLocation = globalThis.location

        globalThis.location = {
          origin: "https://example.com",
          pathname: "/path/"
        } as Location
        const url = yield* _(UrlParams.makeUrl("test", [], Option.none()))
        assert.strictEqual(url.toString(), "https://example.com/path/test")

        globalThis.location = originalLocation
      }))

    it.effect("does not throw if `location` is set to `undefined`", () =>
      Effect.gen(function*(_) {
        const originalLocation = globalThis.location

        // `globalThis.location` is undefined
        // @ts-expect-error
        globalThis.location = undefined
        let url = yield* _(UrlParams.makeUrl("https://example.com", [], Option.none()))
        assert.strictEqual(url.toString(), "https://example.com/")

        // `location` is not in globalThis
        // @ts-expect-error
        delete globalThis.location
        url = yield* _(UrlParams.makeUrl("http://example.com", [], Option.none()))
        assert.strictEqual(url.toString(), "http://example.com/")

        globalThis.location = originalLocation
      }))

    it.effect("does not fail if `location` is partially defined", () =>
      Effect.gen(function*(_) {
        const originalLocation = globalThis.location

        globalThis.location = { href: "" } as Location
        const url1 = yield* _(UrlParams.makeUrl("https://example.com", [], Option.none()))
        assert.strictEqual(url1.toString(), "https://example.com/")

        globalThis.location = {
          href: "",
          origin: "https://example.com"
        } as unknown as Location
        const url2 = yield* _(UrlParams.makeUrl("https://example.com", [], Option.none()))
        assert.strictEqual(url2.toString(), "https://example.com/")

        globalThis.location = {
          href: "",
          pathname: "example_path"
        } as unknown as Location
        const url3 = yield* _(UrlParams.makeUrl("https://example.com", [], Option.none()))
        assert.strictEqual(url3.toString(), "https://example.com/")

        globalThis.location = originalLocation
      }))
  })

  describe("fromInput", () => {
    it("works with non-strings", () => {
      assert.deepStrictEqual(
        UrlParams.fromInput({ a: 1, b: true, c: "string", e: [1, 2, 3] }),
        [
          ["a", "1"],
          ["b", "true"],
          ["c", "string"],
          ["e", "1"],
          ["e", "2"],
          ["e", "3"]
        ]
      )
    })
  })
})
