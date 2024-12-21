import * as Url from "@effect/platform/Url"
import * as UrlParams from "@effect/platform/UrlParams"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("Url", () => {
  const testURL = new URL("https://example.com/test")

  describe("make", () => {
    it.effect("immutable", () =>
      Effect.gen(function*() {
        const url = yield* Url.make(testURL)
        assert.notStrictEqual(url, testURL)
      }))
  })
  describe("setters", () => {
    it("immutable", () => {
      const hashUrl = Url.setHash(testURL, "test")
      assert.notStrictEqual(hashUrl, testURL)
      assert.strictEqual(hashUrl.toString(), "https://example.com/test#test")
    })
  })
  it("modifyUrlParams", () => {
    const paramsUrl = Url.modifyUrlParams(testURL, (x) => UrlParams.append(x, "key", "value"))
    assert.notStrictEqual(paramsUrl, testURL)
    assert.strictEqual(paramsUrl.toString(), "https://example.com/test?key=value")
  })
})
