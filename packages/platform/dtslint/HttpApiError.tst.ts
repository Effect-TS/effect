import type { HttpApiError } from "@effect/platform"

import type { Unify } from "effect"

import { describe, expect, it } from "tstyche"

describe("HttpApiError", () => {
  describe("Unify", () => {
    it("should unify error types", () => {
      type testType = Unify.Unify<HttpApiError.NotFound | HttpApiError.RequestTimeout>
      expect<testType>()
        .type.toBe<HttpApiError.NotFound | HttpApiError.RequestTimeout>()
    })
  })
})
