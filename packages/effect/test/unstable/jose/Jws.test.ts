import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as Jws from "effect/unstable/jose/Jws"

const fromBase64Url = (value: string) =>
  Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)),
    (c) => c.charCodeAt(0)
  )

const A1_TOKEN = "eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9" +
  ".eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ" +
  ".dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

describe("Jws", () => {
  // RFC 7515 Appendix A.1: HMAC SHA-256. External ground truth that our
  // decode + verify pipeline matches the bytes produced by the spec authors.
  it.effect("verifies the RFC 7515 A.1 HS256 vector", () =>
    Effect.gen(function*() {
      const key = yield* Effect.promise(() =>
        crypto.subtle.importKey(
          "raw",
          fromBase64Url("AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow"),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"]
        )
      )
      const jws = yield* Schema.decodeUnknownEffect(Jws.Compact)(A1_TOKEN)
      const result = yield* Jws.verify({
        publicKeys: [key],
        payload: Schema.fromJsonString(
          Schema.Struct({
            iss: Schema.String,
            exp: Schema.Number,
            "http://example.com/is_root": Schema.Boolean
          })
        )
      })(jws)
      assert.strictEqual(result.payload.iss, "joe")
      assert.strictEqual(result.payload["http://example.com/is_root"], true)
      assert.strictEqual(result.protected.alg, "HS256")
    }))

  it.effect("rejects the A.1 vector under the wrong key", () =>
    Effect.gen(function*() {
      const key = yield* Effect.promise(() =>
        crypto.subtle.importKey(
          "raw",
          fromBase64Url("AAAAAAAAAAAAAAAAAAAAAA"),
          { name: "HMAC", hash: "SHA-256" },
          false,
          [
            "verify"
          ]
        )
      )
      const jws = yield* Schema.decodeUnknownEffect(Jws.Compact)(A1_TOKEN)
      const error = yield* Effect.flip(Jws.verify({ publicKeys: [key] })(jws))
      assert.strictEqual(error._tag, "InvalidJws")
    }))

  it.effect("signs and verifies a single ES256 signature (Flattened)", () =>
    Effect.gen(function*() {
      const pair = yield* Effect.promise(() =>
        crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
      )
      const encoded = yield* Jws.sign({ privateKeys: [{ algorithm: "ES256", key: pair.privateKey }] })("hello jose", {})
      const jws = yield* Schema.decodeUnknownEffect(Jws.Flattened)(encoded)
      const result = yield* Jws.verify({ publicKeys: [pair.publicKey] })(jws)
      assert.strictEqual(result.payload, "hello jose")
    }))

  it.effect("supports multiple signatures in the General serialization", () =>
    Effect.gen(function*() {
      const a = yield* Effect.promise(() =>
        crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
      )
      const b = yield* Effect.promise(() =>
        crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-384" }, true, ["sign", "verify"])
      )
      const encoded = yield* Jws.sign({
        privateKeys: [
          { algorithm: "ES256", key: a.privateKey },
          { algorithm: "ES384", key: b.privateKey }
        ]
      })("multi", {})
      const jws = yield* Schema.decodeUnknownEffect(Jws.General)(encoded)
      assert.strictEqual(jws.signatures.length, 2)

      // each recipient verifies with only their own key
      for (const key of [a.publicKey, b.publicKey]) {
        const result = yield* Jws.verify({ publicKeys: [key] })(jws)
        assert.strictEqual(result.payload, "multi")
      }
    }))

  it.effect("carries and round-trips a critical extension header", () =>
    Effect.gen(function*() {
      const pair = yield* Effect.promise(() =>
        crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
      )
      const criticalHeaders = { "https://example.com/exp": Schema.Number }
      const encoded = yield* Jws.sign({
        privateKeys: [{ algorithm: "ES256", key: pair.privateKey }],
        criticalHeaders
      })("payload", { "https://example.com/exp": 1300819380 })
      const jws = yield* Schema.decodeUnknownEffect(Jws.Flattened)(encoded)
      const result = yield* Jws.verify({ publicKeys: [pair.publicKey], criticalHeaders })(jws)
      assert.strictEqual(result.payload, "payload")
      assert.deepStrictEqual(result.protected.crit, ["https://example.com/exp"])
      assert.strictEqual((result.protected as Record<string, unknown>)["https://example.com/exp"], 1300819380)
    }))
})
