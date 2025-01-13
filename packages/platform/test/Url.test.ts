import * as Url from "@effect/platform/Url"
import * as UrlParams from "@effect/platform/UrlParams"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect } from "effect"
import { constVoid } from "effect/Function"

describe("Url", () => {
  const testURL = new URL("https://example.com/test")

  describe("mutate", () => {
    it.effect("immutable", () =>
      Effect.gen(function*() {
        const url = Url.mutate(testURL, constVoid)
        assert.notStrictEqual(url, testURL)
      }))
  })

  describe("fromString", () => {
    it.effect("fails on incorrect url", () =>
      Effect.gen(function*() {
        const error = yield* Url.fromString("??").pipe(Effect.flip)
        assert.instanceOf(error, Cause.IllegalArgumentException)
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
    const paramsUrl = Url.modifyUrlParams(testURL, UrlParams.append("key", "value"))
    assert.notStrictEqual(paramsUrl, testURL)
    assert.strictEqual(paramsUrl.toString(), "https://example.com/test?key=value")
  })
})
