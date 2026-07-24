import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import type { JweAlgorithm, JweEncryption } from "effect/unstable/jose/Jwa"
import * as Jwe from "effect/unstable/jose/Jwe"

const encryptions: ReadonlyArray<(typeof JweEncryption)["Type"]> = [
  "A128CBC-HS256",
  "A192CBC-HS384",
  "A256CBC-HS512",
  "A128GCM",
  "A192GCM",
  "A256GCM"
]

const cekBytesFor = (enc: (typeof JweEncryption)["Type"]): number => {
  switch (enc) {
    case "A128GCM":
      return 16
    case "A192GCM":
      return 24
    case "A256GCM":
      return 32
    case "A128CBC-HS256":
      return 32
    case "A192CBC-HS384":
      return 48
    case "A256CBC-HS512":
      return 64
  }
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

const importAesKw = (bytes: Uint8Array) =>
  Effect.promise(() => crypto.subtle.importKey("raw", bytes, "AES-KW", false, ["wrapKey", "unwrapKey"]))
const importAesGcm = (bytes: Uint8Array) =>
  Effect.promise(() => crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]))
const importHmac = (bytes: Uint8Array) =>
  Effect.promise(() => crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, true, ["sign"]))
const importPbkdf2 = (bytes: Uint8Array) =>
  Effect.promise(() => crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveBits"]))

/** Builds an encrypt/decrypt key pair appropriate for a key management algorithm. */
const keysFor = (alg: (typeof JweAlgorithm)["Type"], enc: (typeof JweEncryption)["Type"]) =>
  Effect.gen(function*() {
    switch (alg) {
      case "dir": {
        // The shared key IS the CEK, so it must match the content algorithm's size.
        const key = yield* importHmac(randomBytes(cekBytesFor(enc)))
        return { encryptKey: key, decryptKey: key }
      }
      case "RSA-OAEP":
      case "RSA-OAEP-256": {
        const pair = yield* Effect.promise(() =>
          crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: alg === "RSA-OAEP" ? "SHA-1" : "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
          )
        )
        return { encryptKey: pair.publicKey, decryptKey: pair.privateKey }
      }
      case "A128KW":
      case "A192KW":
      case "A256KW": {
        const bytes = alg === "A128KW" ? 16 : alg === "A192KW" ? 24 : 32
        const key = yield* importAesKw(randomBytes(bytes))
        return { encryptKey: key, decryptKey: key }
      }
      case "A128GCMKW":
      case "A192GCMKW":
      case "A256GCMKW": {
        const bytes = alg === "A128GCMKW" ? 16 : alg === "A192GCMKW" ? 24 : 32
        const key = yield* importAesGcm(randomBytes(bytes))
        return { encryptKey: key, decryptKey: key }
      }
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW": {
        const pair = yield* Effect.promise(() =>
          crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
        )
        return { encryptKey: pair.publicKey, decryptKey: pair.privateKey }
      }
      case "PBES2-HS256+A128KW":
      case "PBES2-HS384+A192KW":
      case "PBES2-HS512+A256KW": {
        const key = yield* importPbkdf2(new TextEncoder().encode("correct horse battery staple"))
        return { encryptKey: key, decryptKey: key }
      }
    }
  })

const algorithms: ReadonlyArray<(typeof JweAlgorithm)["Type"]> = [
  "dir",
  "RSA-OAEP",
  "RSA-OAEP-256",
  "A128KW",
  "A192KW",
  "A256KW",
  "A128GCMKW",
  "A192GCMKW",
  "A256GCMKW",
  "ECDH-ES",
  "ECDH-ES+A128KW",
  "ECDH-ES+A192KW",
  "ECDH-ES+A256KW",
  "PBES2-HS256+A128KW",
  "PBES2-HS384+A192KW",
  "PBES2-HS512+A256KW"
]

describe("Jwe", () => {
  const plaintext = "The true sign of intelligence is not knowledge but imagination."

  describe("round-trips every alg x enc", () => {
    for (const alg of algorithms) {
      it.effect(alg, () =>
        Effect.gen(function*() {
          for (const enc of encryptions) {
            const { decryptKey, encryptKey } = yield* keysFor(alg, enc)
            const jwe = yield* Jwe.encrypt({
              plaintext,
              key: encryptKey,
              algorithm: alg,
              encryption: enc,
              // keep PBES2 fast in tests
              p2c: 1000
            })
            const parts = jwe.split(".")
            assert.strictEqual(parts.length, 5, `${alg}/${enc} is not a 5-part compact JWE`)

            const result = yield* Jwe.decrypt({ jwe, key: decryptKey })
            assert.strictEqual(decode(result.plaintext), plaintext, `${alg}/${enc} did not round-trip`)
            assert.strictEqual(result.protectedHeader.alg, alg)
            assert.strictEqual(result.protectedHeader.enc, enc)
          }
        }))
    }
  })

  it.effect("carries extra protected header parameters", () =>
    Effect.gen(function*() {
      const key = yield* importAesGcm(randomBytes(16))
      const jwe = yield* Jwe.encrypt({
        plaintext,
        key,
        algorithm: "A128GCMKW",
        encryption: "A128GCM",
        protectedHeader: { kid: "key-1", cty: "text/plain" }
      })
      const result = yield* Jwe.decrypt({ jwe, key })
      assert.strictEqual(result.protectedHeader.kid, "key-1")
      assert.strictEqual(result.protectedHeader.cty, "text/plain")
    }))

  it.effect("rejects a tampered ciphertext", () =>
    Effect.gen(function*() {
      const key = yield* importAesGcm(randomBytes(32))
      const jwe = yield* Jwe.encrypt({ plaintext, key, algorithm: "A256GCMKW", encryption: "A256GCM" })
      const parts = jwe.split(".")
      // flip a character in the ciphertext segment
      const ct = parts[3]
      parts[3] = ct.slice(0, -2) + (ct.at(-2) === "A" ? "B" : "A") + ct.at(-1)
      const error = yield* Effect.flip(Jwe.decrypt({ jwe: parts.join("."), key }))
      assert.strictEqual(error.reason, "DecryptionFailed")
    }))

  it.effect("rejects a tampered CBC-HMAC tag", () =>
    Effect.gen(function*() {
      const key = yield* importAesKw(randomBytes(16))
      const jwe = yield* Jwe.encrypt({ plaintext, key, algorithm: "A128KW", encryption: "A128CBC-HS256" })
      const parts = jwe.split(".")
      const tag = parts[4]
      parts[4] = tag.slice(0, -2) + (tag.at(-2) === "A" ? "B" : "A") + tag.at(-1)
      const error = yield* Effect.flip(Jwe.decrypt({ jwe: parts.join("."), key }))
      assert.strictEqual(error.reason, "DecryptionFailed")
    }))

  it.effect("fails to decrypt with the wrong key", () =>
    Effect.gen(function*() {
      const good = yield* keysFor("RSA-OAEP", "A256GCM")
      const other = yield* keysFor("RSA-OAEP", "A256GCM")
      const jwe = yield* Jwe.encrypt({
        plaintext,
        key: good.encryptKey,
        algorithm: "RSA-OAEP",
        encryption: "A256GCM"
      })
      const error = yield* Effect.flip(Jwe.decrypt({ jwe, key: other.decryptKey }))
      assert.include(["DecryptionFailed", "KeyManagementFailed"], error.reason)
    }))

  // RFC 7516 Appendix A.3: A128KW + A128CBC-HS256. This is external ground
  // truth for the composite AES-CBC-HMAC content decryption and AES key
  // unwrap against the exact bytes produced by the spec authors.
  it.effect("decrypts the RFC 7516 A.3 vector", () =>
    Effect.gen(function*() {
      // JWK { kty: "oct", k: "GawgguFyGrWKav7AX4VKUg" }
      const rawKey = Uint8Array.from(atob("GawgguFyGrWKav7AX4VKUg".replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) =>
        c.charCodeAt(0))
      const key = yield* importAesKw(rawKey)
      const jwe = "eyJhbGciOiJBMTI4S1ciLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0." +
        "6KB707dM9YTIgHtLvtgWQ8mKwboJW3of9locizkDTHzBC2IlrT1oOQ." +
        "AxY8DCtDaGlsbGljb3RoZQ." +
        "KDlTtXchhZTGufMYmOYGS4HffxPSUrfmqCHXaI9wOGY." +
        "U0m_YmjN04DJvceFICbCVQ"
      const result = yield* Jwe.decrypt({ jwe, key })
      assert.strictEqual(decode(result.plaintext), "Live long and prosper.")
      assert.strictEqual(result.protectedHeader.alg, "A128KW")
      assert.strictEqual(result.protectedHeader.enc, "A128CBC-HS256")
    }))
})
