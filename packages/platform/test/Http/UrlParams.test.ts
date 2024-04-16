import * as UrlParams from "@effect/platform/Http/UrlParams"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("UrlParams", () => {
  describe("makeUrl", () => {
    it.effect("does not throw if `location` is set to `undefined`", () =>
      Effect.gen(function*(_) {
        const originalLocation = globalThis.location

        // `globalThis.location` is undefined
        // @ts-expect-error
        globalThis.location = undefined
        let url = yield* _(UrlParams.makeUrl("http://example.com", [], () => "error"))
        assert.strictEqual(url.toString(), "http://example.com/")

        // `location` is not in globalThis
        // @ts-expect-error
        delete globalThis.location
        url = yield* _(UrlParams.makeUrl("http://example.com", [], () => "error"))
        assert.strictEqual(url.toString(), "http://example.com/")

        globalThis.location = originalLocation
      }))
  })
})
