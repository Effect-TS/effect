import { HttpApi, HttpApiScalar } from "effect/http-api"
import { describe, expect, it } from "tstyche"

describe("HttpApiScalar", () => {
  it("accepts a preferred authentication security scheme", () => {
    expect(HttpApiScalar.layer).type.toBeCallableWith(HttpApi.make("api"), {
      scalar: {
        authentication: { preferredSecurityScheme: "Bearer" }
      }
    })
  })
})
