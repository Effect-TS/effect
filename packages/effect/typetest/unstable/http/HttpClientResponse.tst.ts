import { HttpClientResponse } from "effect/unstable/http"
import { describe, expect, it } from "tstyche"

declare const response: HttpClientResponse.HttpClientResponse

describe("HttpClientResponse", () => {
  describe("source", () => {
    it("should be an optional platform object", () => {
      expect(response.source).type.toBe<object | undefined>()
    })
  })

  describe("toWeb", () => {
    it("should return the original Web Response when available", () => {
      expect(HttpClientResponse.toWeb(response)).type.toBe<globalThis.Response | undefined>()
    })
  })
})
