import { assert, describe, it } from "@effect/vitest"
import * as CryptoError from "effect/crypto/CryptoError"

describe("CryptoError", () => {
  it("formats its message from the algorithm, method, and reason", () => {
    const error = new CryptoError.CryptoError({
      algorithm: "AES-GCM",
      method: "decrypt",
      reason: new CryptoError.AuthenticationFailed({ description: "Could not authenticate or decrypt data" })
    })
    assert.strictEqual(error.message, "AES-GCM.decrypt: AuthenticationFailed: Could not authenticate or decrypt data")
    assert.isTrue(CryptoError.isCryptoError(error))
    assert.strictEqual(error.cause, error.reason)
  })
})
