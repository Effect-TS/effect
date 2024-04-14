import * as UrlParams from "@effect/platform/Http/UrlParams"
import { assert, describe, it } from "vitest"

describe("UrlParams", () => {
  describe("baseUrl", () => {
    it("should return undefined when `location` is not in `globalThis` or `globalThis.location` is undefined", () => {
      const originalLocation = globalThis.location

      // `globalThis.location` is undefined
      // @ts-expect-error
      globalThis.location = undefined
      assert.strictEqual("location" in globalThis, true)
      assert.strictEqual(globalThis.location, undefined)
      assert.strictEqual(UrlParams.baseUrl(), undefined)

      // `location` is not in globalThis
      // @ts-expect-error
      delete globalThis.location
      assert.strictEqual("location" in globalThis, false)
      assert.strictEqual(globalThis.location, undefined)
      assert.strictEqual(UrlParams.baseUrl(), undefined)

      globalThis.location = originalLocation
    })
  })
})
