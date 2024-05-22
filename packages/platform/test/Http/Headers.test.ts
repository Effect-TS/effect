import * as Headers from "@effect/platform/Http/Headers"
import * as Secret from "effect/Secret"
import { assert, describe, it } from "vitest"

describe("Headers", () => {
  describe("redact", () => {
    it("one key", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const redacted = Headers.redact(headers, "Authorization")

      assert.deepEqual(redacted, {
        "content-type": "application/json",
        "authorization": Secret.make("some secret"),
        "x-api-key": "some-key"
      })
      assert.strictEqual(Secret.value(redacted.authorization as Secret.Secret<string>), "Bearer some-token")
    })

    it("multiple keys", () => {
      const headers = Headers.fromInput({
        "Content-Type": "application/json",
        "Authorization": "Bearer some-token",
        "X-Api-Key": "some-key"
      })

      const redacted = Headers.redact(headers, ["Authorization", "authorization", "X-Api-Token", "x-api-key"])

      assert.deepEqual(redacted, {
        "content-type": "application/json",
        "authorization": Secret.make("some secret"),
        "x-api-key": Secret.make("some secret")
      })
      assert.strictEqual(Secret.value(redacted.authorization as Secret.Secret<string>), "Bearer some-token")
      assert.strictEqual(Secret.value(redacted["x-api-key"] as Secret.Secret<string>), "some-key")
    })

    it("RegExp", () => {
      const headers = Headers.fromInput({
        "Authorization": "Bearer some-token",
        "sec-ret": "some",
        "sec-ret-2": "some"
      })

      const redacted = Headers.redact(headers, [/^sec-/])

      assert.deepEqual(redacted, {
        "authorization": "Bearer some-token",
        "sec-ret": Secret.make("some"),
        "sec-ret-2": Secret.make("some")
      })
    })
  })
})
