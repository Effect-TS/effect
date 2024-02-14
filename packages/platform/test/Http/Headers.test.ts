import * as Headers from "@effect/platform/Http/Headers"
import * as Secret from "effect/Secret"
import { assert, describe, it } from "vitest"

describe("Headers", () => {
  it("redact", () => {
    const headers = Headers.fromInput({
      "Content-Type": "application/json",
      "Authorization": "Bearer some-token",
      "X-Api-Key": "some-key"
    })

    const redacted = Headers.redact(headers, "Authorization")

    assert.deepEqual(redacted, {
      "content-type": "application/json",
      "authorization": Secret.fromString("some secret"),
      "x-api-key": "some-key"
    })
    assert.strictEqual(Secret.value(redacted.authorization as Secret.Secret), "Bearer some-token")
  })
})
