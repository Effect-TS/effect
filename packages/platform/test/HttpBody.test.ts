import { HttpBody, UrlParams } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Effect, Schema } from "effect"

describe("HttpBody", () => {
  test("json supports contentType", async () => {
    const body = await Effect.runPromise(HttpBody.json({ foo: "bar" }, "application/problem+json"))
    strictEqual(body.contentType, "application/problem+json")
  })

  test("unsafeJson supports contentType", () => {
    const body = HttpBody.unsafeJson({ foo: "bar" }, "application/vnd.api+json")
    strictEqual(body.contentType, "application/vnd.api+json")
  })

  test("jsonSchema supports contentType", async () => {
    const encode = HttpBody.jsonSchema(Schema.Struct({ foo: Schema.String }))
    const body = await Effect.runPromise(encode({ foo: "bar" }, "application/merge-patch+json"))
    strictEqual(body.contentType, "application/merge-patch+json")
  })

  test("urlParams supports contentType", () => {
    const body = HttpBody.urlParams(UrlParams.fromInput({ foo: "bar" }), "text/plain")
    strictEqual(body.contentType, "text/plain")
  })
})
