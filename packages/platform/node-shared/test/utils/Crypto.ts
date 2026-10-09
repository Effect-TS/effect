import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as PlatformError from "effect/PlatformError"
import * as NativeCrypto from "node:crypto"
import {
  constants,
  createCipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  getCiphers,
  pbkdf2Sync,
  privateDecrypt,
  sign,
  verify
} from "node:crypto"

const slice = (data: Uint8Array): Uint8Array => {
  const backing = new Uint8Array(data.length + 7).fill(0xff)
  backing.set(data, 3)
  return backing.subarray(3, 3 + data.length)
}

const encode = (text: string): Uint8Array => new TextEncoder().encode(text)
const hex = (data: Uint8Array): string => Array.from(data, (byte) => byte.toString(16).padStart(2, "0")).join("")
const hashes = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const
const nativeHash = (hash: Crypto.HmacAlgorithm): string => hash.replace("-", "").toLowerCase()

const supportsNativeArgon2 = (): boolean => {
  if (typeof NativeCrypto.argon2Sync !== "function") return false
  try {
    NativeCrypto.argon2Sync("argon2id", {
      message: new Uint8Array(),
      nonce: new Uint8Array(8),
      memory: 8,
      passes: 1,
      parallelism: 1,
      tagLength: 4
    })
    return true
  } catch (cause) {
    // Some runtimes export an Argon2 stub even when their crypto engine omits it.
    if ((cause as { code?: string }).code === "ERR_CRYPTO_ARGON2_NOT_SUPPORTED") return false
    throw cause
  }
}

export const cryptoTests = (layer: Layer.Layer<Crypto.Crypto>, md5: boolean, nativeExtras = false): void => {
  describe("native cryptography contracts", () => {
    it.effect("matches RFC 5869 HKDF and native outputs for every SHA hash", () =>
      Effect.gen(function*() {
        const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"))
        // RFC 5869 Appendix A.1.
        const key = slice(new Uint8Array(22).fill(0x0b))
        const salt = slice(bytes("000102030405060708090a0b0c"))
        const info = slice(bytes("f0f1f2f3f4f5f6f7f8f9"))
        assert.strictEqual(
          hex(yield* Crypto.hkdf("SHA-256", key, salt, info, 42)),
          "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
        )
        for (const hash of hashes) {
          const maximum = 255 * { "SHA-1": 20, "SHA-256": 32, "SHA-384": 48, "SHA-512": 64 }[hash]
          const empty = new Uint8Array()
          assert.deepStrictEqual(
            yield* Crypto.hkdf(hash, empty, empty, empty, 42),
            new Uint8Array(NativeCrypto.hkdfSync(nativeHash(hash), empty, empty, empty, 42))
          )
          for (const length of [1, 42, maximum]) {
            const expected = new Uint8Array(
              NativeCrypto.hkdfSync(nativeHash(hash), key, new Uint8Array(), new Uint8Array(), length)
            )
            assert.deepStrictEqual(yield* Crypto.hkdf(hash, key, new Uint8Array(), new Uint8Array(), length), expected)
          }
          for (const length of [0, -1, 0.5, Infinity, maximum + 1]) {
            const error = yield* Effect.flip(Crypto.hkdf(hash, key, salt, info, length))
            assert.strictEqual(error.reason._tag, "BadArgument")
          }
        }
      }).pipe(Effect.provide(layer)))

    it.effect("derives the RFC 9106 Argon2id vector or reports native unavailability", () =>
      Effect.gen(function*() {
        // RFC 9106 section 5.3, including secret and associated data.
        const options: Crypto.Argon2idOptions = {
          password: slice(new Uint8Array(32).fill(1)),
          salt: slice(new Uint8Array(16).fill(2)),
          secret: slice(new Uint8Array(8).fill(3)),
          associatedData: slice(new Uint8Array(12).fill(4)),
          memoryKiB: 32,
          passes: 3,
          parallelism: 4,
          length: 32
        }
        if (nativeExtras && supportsNativeArgon2()) {
          assert.strictEqual(
            hex(yield* Crypto.argon2id(options)),
            "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659"
          )
          assert.deepStrictEqual(options.password, new Uint8Array(32).fill(1))
          assert.deepStrictEqual(options.secret, new Uint8Array(8).fill(3))
        } else {
          const error = yield* Effect.flip(Crypto.argon2id(options))
          assert.strictEqual(error.reason.method, "argon2id")
        }
        for (
          const invalid of [
            { memoryKiB: 31 },
            { memoryKiB: 2 ** 32 },
            { passes: 0 },
            { parallelism: 0 },
            { parallelism: 2 ** 24 },
            { length: 3 },
            { salt: new Uint8Array(7) }
          ]
        ) {
          const error = yield* Effect.flip(Crypto.argon2id({ ...options, ...invalid }))
          assert.strictEqual(error.reason._tag, "BadArgument")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("matches the XChaCha draft vector and authenticates all inputs", () =>
      Effect.gen(function*() {
        // draft-irtf-cfrg-xchacha-03, Appendix A.3.1.
        const bytes = (hex: string) => slice(Uint8Array.from(Buffer.from(hex, "hex")))
        const options: Crypto.XChaCha20Poly1305Options = {
          key: bytes("808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f"),
          nonce: bytes("404142434445464748494a4b4c4d4e4f5051525354555657"),
          additionalData: bytes("50515253c0c1c2c3c4c5c6c7"),
          data: encode(
            "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
          )
        }
        if (nativeExtras && getCiphers().includes("chacha20-poly1305")) {
          const encrypted = yield* Crypto.xchacha20poly1305Encrypt(options)
          assert.strictEqual(
            hex(encrypted),
            "bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb731c7f1b0b4aa6440bf3a82f4eda7e39ae64c6708c54c216cb96b72e1213b4522f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff921f9664c97637da9768812f615c68b13b52ec0875924c1c7987947deafd8780acf49"
          )
          assert.deepStrictEqual(
            yield* Crypto.xchacha20poly1305Decrypt({ ...options, data: slice(encrypted) }),
            options.data
          )
          const altered = encrypted.slice()
          altered[altered.length - 1] ^= 1
          for (
            const invalid of [
              { data: altered },
              { nonce: new Uint8Array(24) },
              { additionalData: Uint8Array.of(1) },
              { key: new Uint8Array(32) },
              { data: new Uint8Array(15) }
            ]
          ) {
            const error = yield* Effect.flip(
              Crypto.xchacha20poly1305Decrypt({ ...options, data: encrypted, ...invalid })
            )
            assert.strictEqual(error.reason.method, "xchacha20poly1305Decrypt")
          }
          for (const size of [0, 1, 63, 64, 65, 4097]) {
            const data = slice(new Uint8Array(size).fill(42))
            const nonce = yield* Crypto.randomBytes(24)
            const ciphertext = yield* Crypto.xchacha20poly1305Encrypt({ ...options, nonce, data })
            assert.deepStrictEqual(
              yield* Crypto.xchacha20poly1305Decrypt({ ...options, nonce, data: ciphertext }),
              data
            )
          }
        } else {
          for (
            const operation of [Crypto.xchacha20poly1305Encrypt(options), Crypto.xchacha20poly1305Decrypt(options)]
          ) {
            const error = yield* Effect.flip(operation)
            assert.strictEqual(error.reason.module, "Crypto")
          }
        }
        for (const invalid of [{ key: new Uint8Array(31) }, { nonce: new Uint8Array(23) }]) {
          const error = yield* Effect.flip(Crypto.xchacha20poly1305Encrypt({ ...options, ...invalid }))
          assert.strictEqual(error.reason._tag, "BadArgument")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("converts JWK material to native secret, public, and private keys", () =>
      Effect.gen(function*() {
        for (
          const algorithm of [
            { name: "AES-GCM", length: 256 },
            { name: "HMAC", hash: "SHA-256" }
          ] as const
        ) {
          const key = yield* Crypto.generateSecretKey(algorithm, { extractable: true })
          const jwk = yield* Crypto.exportJwk(key)
          assert.strictEqual(jwk.kty, "oct")
          const imported = yield* Crypto.importJwk(jwk, algorithm, { extractable: true })
          assert.deepStrictEqual(yield* Crypto.exportKey("raw", imported), yield* Crypto.exportKey("raw", key))
          const opaque = yield* Crypto.importJwk(jwk, algorithm)
          const forbidden = yield* Effect.flip(Crypto.exportJwk(opaque))
          assert.strictEqual(forbidden.reason.method, "exportJwk")
        }
        for (
          const algorithm of [
            { name: "RSA-PSS", hash: "SHA-256" },
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            { name: "RSA-OAEP", hash: "SHA-256" },
            { name: "ECDSA", namedCurve: "P-256" },
            { name: "Ed25519" }
          ] as const
        ) {
          const pair = yield* Crypto.generateKeyPair(algorithm, { extractable: true })
          for (const [key, format] of [[pair.publicKey, "spki"], [pair.privateKey, "pkcs8"]] as const) {
            const jwk = yield* Crypto.exportJwk(key)
            const imported = yield* Crypto.importJwk(jwk, algorithm, { extractable: true })
            assert.deepStrictEqual(yield* Crypto.exportKey(format, imported), yield* Crypto.exportKey(format, key))
            const blocked = yield* Effect.flip(
              Crypto.importJwk({ ...jwk, ext: false }, algorithm, { extractable: true })
            )
            assert.strictEqual(blocked.reason.method, "importJwk")
          }
        }
        const key = yield* Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256" }, { extractable: true })
        const jwk = yield* Crypto.exportJwk(key)
        const verifier = yield* Crypto.importJwk({ ...jwk, key_ops: ["verify"] }, { name: "HMAC", hash: "SHA-256" }, {
          usages: ["verify"]
        })
        const data = Uint8Array.of(1, 2, 3)
        const signature = yield* Crypto.sign({ name: "HMAC" }, key, data)
        assert.strictEqual(yield* Crypto.verify({ name: "HMAC" }, verifier, signature, data), true)
        assert.strictEqual((yield* Effect.flip(Crypto.sign({ name: "HMAC" }, verifier, data))).reason.method, "sign")
        const signer = yield* Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256" }, {
          extractable: true,
          usages: ["sign"]
        })
        const restored = yield* Crypto.importJwk(yield* Crypto.exportJwk(signer), { name: "HMAC", hash: "SHA-256" })
        assert.deepStrictEqual(restored.usages, ["sign"])
        for (const invalid of [{ ...jwk, alg: "HS512" }, { kty: "oct", k: "not-base64url!" }]) {
          const error = yield* Effect.flip(Crypto.importJwk(invalid, { name: "HMAC", hash: "SHA-256" }))
          assert.strictEqual(error.reason.method, "importJwk")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("matches every digest for empty and sliced binary inputs", () =>
      Effect.gen(function*() {
        const algorithms: ReadonlyArray<Crypto.DigestAlgorithm> = md5 ? ["MD5", ...hashes] : hashes
        const data = slice(Uint8Array.from({ length: 4097 }, (_, i) => i & 0xff))
        const before = data.slice()
        for (const algorithm of algorithms) {
          for (const input of [new Uint8Array(), data]) {
            const expected = createHash(algorithm.replace("-", "").toLowerCase()).update(input).digest()
            assert.deepStrictEqual(yield* Crypto.digest(algorithm, input), Uint8Array.from(expected))
          }
        }
        assert.deepStrictEqual(data, before)
      }).pipe(Effect.provide(layer)))

    it.effect("matches empty and oversized HMAC keys for every hash", () =>
      Effect.gen(function*() {
        const data = slice(Uint8Array.of(0, 255, 128, 1))
        for (const algorithm of hashes) {
          for (const key of [new Uint8Array(), slice(new Uint8Array(131).fill(0xaa))]) {
            const before = key.slice()
            const expected = createHmac(nativeHash(algorithm), key).update(data).digest()
            assert.deepStrictEqual(yield* Crypto.hmac(algorithm, key, data), Uint8Array.from(expected))
            assert.deepStrictEqual(key, before)
          }
        }
      }).pipe(Effect.provide(layer)))

    it.effect("derives binary passwords and partial or multiple output blocks for every hash", () =>
      Effect.gen(function*() {
        const password = slice(Uint8Array.of(0, 255, 128, 1))
        for (const algorithm of hashes) {
          for (const length of [1, 17, 129]) {
            for (const salt of [new Uint8Array(), slice(encode("sa\0lt"))]) {
              const expected = pbkdf2Sync(password, salt, 2, length, nativeHash(algorithm))
              assert.deepStrictEqual(
                yield* Crypto.pbkdf2(algorithm, password, salt, 2, length),
                Uint8Array.from(expected)
              )
            }
          }
          const error = yield* Effect.flip(Crypto.pbkdf2(algorithm, password, new Uint8Array(), 2 ** 32 + 1, 32))
          assert.strictEqual(error.reason.method, "pbkdf2")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("matches the NIST AES-GCM vector and rejects altered authenticated inputs", () =>
      Effect.gen(function*() {
        // NIST SP 800-38D, AES-128 with zero key, IV, and one plaintext block.
        const iv = slice(new Uint8Array(12))
        const options: Crypto.CipherOptions = { name: "AES-GCM", iv }
        const data = slice(new Uint8Array(16))
        for (
          const [length, expected] of [
            [128, "0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf"],
            [192, "98e7247c07f0fe411c267e4384b0f6002ff58d80033927ab8ef4d4587514f0fb"],
            [256, "cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919"]
          ] as const
        ) {
          const key = yield* Crypto.importKey("raw", slice(new Uint8Array(length / 8)), { name: "AES-GCM", length })
          const ciphertext = yield* Crypto.encrypt(options, key, data)
          assert.strictEqual(hex(ciphertext), expected)
          assert.deepStrictEqual(yield* Crypto.decrypt(options, key, slice(ciphertext)), data)
        }
        const key = yield* Crypto.importKey("raw", slice(new Uint8Array(16)), { name: "AES-GCM", length: 128 })
        const encrypted = yield* Crypto.encrypt(options, key, data)
        assert.strictEqual(hex(encrypted), "0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf")
        assert.deepStrictEqual(yield* Crypto.decrypt(options, key, slice(encrypted)), data)
        const tampered = encrypted.slice()
        tampered[tampered.length - 1] ^= 1
        const wrongIv = new Uint8Array(12).fill(1)
        for (
          const operation of [
            Crypto.decrypt(options, key, tampered),
            Crypto.decrypt({ name: "AES-GCM", iv: wrongIv }, key, encrypted),
            Crypto.decrypt({ name: "AES-GCM", iv, additionalData: Uint8Array.of(1) }, key, encrypted),
            Crypto.decrypt(options, key, new Uint8Array(15))
          ]
        ) {
          const error = yield* Effect.flip(operation)
          assert.strictEqual(error.reason.method, "decrypt")
        }
        const invalidIv = yield* Effect.flip(Crypto.encrypt({ name: "AES-GCM", iv: new Uint8Array(11) }, key, data))
        assert.strictEqual(invalidIv.reason._tag, "BadArgument")
        assert.deepStrictEqual(iv, new Uint8Array(12))
        assert.deepStrictEqual(data, new Uint8Array(16))
      }).pipe(Effect.provide(layer)))

    it.effect("interoperates with native AES-GCM for empty and partial blocks with additional data", () =>
      Effect.gen(function*() {
        for (const length of [128, 192, 256] as const) {
          const key = yield* Crypto.generateSecretKey({ name: "AES-GCM", length }, { extractable: true })
          const raw = yield* Crypto.exportKey("raw", key)
          for (const size of [0, 1, 17, 4097]) {
            const iv = yield* Crypto.randomBytes(12)
            const additionalData = slice(Uint8Array.of(0, 255, 128))
            const data = slice(new Uint8Array(size).fill(42))
            const options: Crypto.CipherOptions = { name: "AES-GCM", iv, additionalData }
            const encrypted = yield* Crypto.encrypt(options, key, data)
            // Deno's node:crypto shim omits some ciphers supported by its SubtleCrypto.
            const cipher = `aes-${length}-gcm` as const
            if (getCiphers().includes(cipher)) {
              const native = createCipheriv(cipher, raw, iv)
              native.setAAD(additionalData)
              const expected = Uint8Array.from(
                Buffer.concat([native.update(data), native.final(), native.getAuthTag()])
              )
              assert.deepStrictEqual(encrypted, expected)
            }
            assert.deepStrictEqual(yield* Crypto.decrypt(options, key, slice(encrypted)), data)
          }
        }
      }).pipe(Effect.provide(layer)))

    it.effect("generates and imports secret keys with enforced exportability and usages", () =>
      Effect.gen(function*() {
        for (const length of [128, 192, 256] as const) {
          const algorithm: Crypto.SecretKeyAlgorithm = { name: "AES-GCM", length }
          const key = yield* Crypto.generateSecretKey(algorithm)
          assert.strictEqual(key.type, "secret")
          assert.strictEqual(key.extractable, false)
          assert.deepStrictEqual(key.algorithm, algorithm)
          assert.deepStrictEqual(Array.from(key.usages).sort(), ["decrypt", "encrypt"])
          const error = yield* Effect.flip(Crypto.exportKey("raw", key))
          assert.strictEqual(error.reason.method, "exportKey")
          const exportable = yield* Crypto.generateSecretKey(algorithm, { extractable: true, usages: ["encrypt"] })
          const bytes = yield* Crypto.exportKey("raw", exportable)
          assert.strictEqual(bytes.length, length / 8)
          const imported = yield* Crypto.importKey("raw", slice(bytes), algorithm, {
            extractable: true,
            usages: ["encrypt"]
          })
          assert.deepStrictEqual(yield* Crypto.exportKey("raw", imported), bytes)
          const ciphertext = yield* Crypto.encrypt(
            { name: "AES-GCM", iv: new Uint8Array(12) },
            imported,
            new Uint8Array()
          )
          const disallowed = yield* Effect.flip(
            Crypto.decrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, imported, ciphertext)
          )
          assert.strictEqual(disallowed.reason.method, "decrypt")
          const forged: Crypto.Key = { ...imported, usages: ["decrypt"] }
          const rejected = yield* Effect.flip(
            Crypto.decrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, forged, ciphertext)
          )
          assert.strictEqual(rejected.reason._tag, "BadArgument")
          assert.deepStrictEqual(
            Object.keys(key).sort(),
            ["~effect/Crypto/Key", "algorithm", "extractable", "type", "usages"].sort()
          )
        }
      }).pipe(Effect.provide(layer)))

    it.effect("signs and verifies managed HMAC keys with every hash", () =>
      Effect.gen(function*() {
        const data = slice(encode("authenticated data"))
        for (const hash of hashes) {
          const key = yield* Crypto.generateSecretKey({ name: "HMAC", hash, length: 256 }, { extractable: true })
          const raw = yield* Crypto.exportKey("raw", key)
          const signature = yield* Crypto.sign({ name: "HMAC" }, key, data)
          assert.deepStrictEqual(signature, yield* Crypto.hmac(hash, raw, data))
          assert.strictEqual(yield* Crypto.verify({ name: "HMAC" }, key, slice(signature), data), true)
          assert.strictEqual(yield* Crypto.verify({ name: "HMAC" }, key, signature, Uint8Array.of(1)), false)
          assert.strictEqual(yield* Crypto.verify({ name: "HMAC" }, key, new Uint8Array(), data), false)
          const imported = yield* Crypto.importKey("raw", raw, { name: "HMAC", hash }, { usages: ["verify"] })
          assert.strictEqual(yield* Crypto.verify({ name: "HMAC" }, imported, signature, data), true)
          const disallowed = yield* Effect.flip(Crypto.sign({ name: "HMAC" }, imported, data))
          assert.strictEqual(disallowed.reason.method, "sign")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("generates RSA-OAEP keys and interoperates with existing byte-oriented encryption", () =>
      Effect.gen(function*() {
        const algorithm: Crypto.KeyPairAlgorithm = { name: "RSA-OAEP", hash: "SHA-256" }
        const pair = yield* Crypto.generateKeyPair(algorithm)
        assert.strictEqual(pair.publicKey.type, "public")
        assert.strictEqual(pair.publicKey.extractable, true)
        assert.strictEqual(pair.privateKey.type, "private")
        assert.strictEqual(pair.privateKey.extractable, false)
        assert.deepStrictEqual(pair.publicKey.usages, ["encrypt"])
        assert.deepStrictEqual(pair.privateKey.usages, ["decrypt"])
        const error = yield* Effect.flip(Crypto.exportKey("pkcs8", pair.privateKey))
        assert.strictEqual(error.reason.method, "exportKey")
        const publicKey = yield* Crypto.exportKey("spki", pair.publicKey)
        const data = slice(Uint8Array.of(0, 255, 128, 42))
        const label = slice(Uint8Array.of(0, 255, 128))
        const encrypted = yield* Crypto.rsaOaepEncrypt({ publicKey, data, label })
        assert.deepStrictEqual(
          yield* Crypto.decrypt({ name: "RSA-OAEP", label }, pair.privateKey, slice(encrypted)),
          data
        )
        const ciphertext = yield* Crypto.encrypt({ name: "RSA-OAEP", label }, pair.publicKey, data)
        assert.deepStrictEqual(yield* Crypto.decrypt({ name: "RSA-OAEP", label }, pair.privateKey, ciphertext), data)
        const wrongLabel = yield* Effect.flip(
          Crypto.decrypt({ name: "RSA-OAEP", label: Uint8Array.of(1) }, pair.privateKey, ciphertext)
        )
        assert.strictEqual(wrongLabel.reason.method, "decrypt")
        const imported = yield* Crypto.importKey("spki", slice(publicKey), algorithm)
        assert.deepStrictEqual(yield* Crypto.exportKey("spki", imported), publicKey)
      }).pipe(Effect.provide(layer)))

    it.effect("imports and exports RSA private keys and accepts the exact OAEP payload limit", () =>
      Effect.gen(function*() {
        const algorithm: Crypto.KeyPairAlgorithm = { name: "RSA-OAEP", hash: "SHA-256" }
        const pair = yield* Crypto.generateKeyPair(algorithm, { extractable: true })
        const encoded = yield* Crypto.exportKey("pkcs8", pair.privateKey)
        const key = yield* Crypto.importKey("pkcs8", slice(encoded), algorithm, { extractable: true })
        assert.deepStrictEqual(yield* Crypto.exportKey("pkcs8", key), encoded)
        const data = new Uint8Array(256 - 2 * 32 - 2).fill(42)
        const encrypted = yield* Crypto.encrypt({ name: "RSA-OAEP" }, pair.publicKey, data)
        assert.deepStrictEqual(yield* Crypto.decrypt({ name: "RSA-OAEP" }, key, encrypted), data)
        assert.deepStrictEqual(
          Uint8Array.from(privateDecrypt({
            key: createPrivateKey({ key: Buffer.from(encoded), format: "der", type: "pkcs8" }),
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
          }, encrypted)),
          data
        )
        const tooLong = yield* Effect.flip(
          Crypto.encrypt({ name: "RSA-OAEP" }, pair.publicKey, new Uint8Array(data.length + 1))
        )
        assert.strictEqual(tooLong.reason.method, "encrypt")
        const weak = yield* Effect.flip(Crypto.generateKeyPair({ ...algorithm, modulusLength: 1024 }))
        assert.strictEqual(weak.reason._tag, "BadArgument")
      }).pipe(Effect.provide(layer)))

    it.effect("interoperates with native RSA-PSS, ECDSA and Ed25519 verification", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<readonly [Crypto.KeyPairAlgorithm, Crypto.SigningOptions, string | null]> = [
          [{ name: "RSA-PSS", hash: "SHA-256" }, { name: "RSA-PSS" }, "sha256"],
          [{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, { name: "RSASSA-PKCS1-v1_5" }, "sha256"],
          [{ name: "ECDSA", namedCurve: "P-256" }, { name: "ECDSA", hash: "SHA-256" }, "sha256"],
          [{ name: "ECDSA", namedCurve: "P-384" }, { name: "ECDSA", hash: "SHA-384" }, "sha384"],
          [{ name: "ECDSA", namedCurve: "P-521" }, { name: "ECDSA", hash: "SHA-512" }, "sha512"],
          [{ name: "Ed25519" }, { name: "Ed25519" }, null]
        ]
        const data = slice(Uint8Array.of(0, 255, 128, 42))
        for (const [algorithm, options, hash] of cases) {
          const pair = yield* Crypto.generateKeyPair(algorithm, { extractable: true })
          const signature = yield* Crypto.sign(options, pair.privateKey, data)
          assert.strictEqual(yield* Crypto.verify(options, pair.publicKey, slice(signature), data), true)
          assert.strictEqual(yield* Crypto.verify(options, pair.publicKey, signature, Uint8Array.of(1)), false)
          const publicBytes = yield* Crypto.exportKey("spki", pair.publicKey)
          const privateBytes = yield* Crypto.exportKey("pkcs8", pair.privateKey)
          if (options.name === "RSA-PSS") {
            for (const hash of hashes) {
              const algorithm: Crypto.KeyPairAlgorithm = { name: "RSA-PSS", hash }
              const signer = yield* Crypto.importKey("pkcs8", privateBytes, algorithm)
              const verifier = yield* Crypto.importKey("spki", publicBytes, algorithm)
              const signature = yield* Crypto.sign(options, signer, data)
              assert.strictEqual(yield* Crypto.verify(options, verifier, signature, data), true)
              const zeroSalt = yield* Crypto.sign({ name: "RSA-PSS", saltLength: 0 }, signer, data)
              assert.strictEqual(
                yield* Crypto.verify({ name: "RSA-PSS", saltLength: 0 }, verifier, zeroSalt, data),
                true
              )
              const invalid = yield* Effect.flip(Crypto.sign({ name: "RSA-PSS", saltLength: -1 }, signer, data))
              assert.strictEqual(invalid.reason._tag, "BadArgument")
            }
          }
          const publicKey = yield* Crypto.importKey("spki", slice(publicBytes), algorithm)
          const privateKey = yield* Crypto.importKey("pkcs8", slice(privateBytes), algorithm)
          const importedSignature = yield* Crypto.sign(options, privateKey, data)
          assert.strictEqual(yield* Crypto.verify(options, publicKey, importedSignature, data), true)
          const nativeKey = createPublicKey({ key: Buffer.from(publicBytes), format: "der", type: "spki" })
          assert.strictEqual(
            verify(hash, data, {
              key: nativeKey,
              ...(options.name === "RSA-PSS" ? { padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 } : {}),
              ...(options.name === "ECDSA" ? { dsaEncoding: "ieee-p1363" as const } : {})
            }, signature),
            true
          )
          const nativeSignature = sign(hash, data, {
            key: createPrivateKey({ key: Buffer.from(privateBytes), format: "der", type: "pkcs8" }),
            ...(options.name === "RSA-PSS" ? { padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 8 } : {}),
            ...(options.name === "ECDSA" ? { dsaEncoding: "ieee-p1363" as const } : {})
          })
          assert.strictEqual(
            yield* Crypto.verify(
              options.name === "RSA-PSS" ? { ...options, saltLength: 8 } : options,
              publicKey,
              nativeSignature,
              data
            ),
            true
          )
          if (options.name === "ECDSA") {
            assert.strictEqual(
              signature.length,
              algorithm.name === "ECDSA" && algorithm.namedCurve === "P-521"
                ? 132
                : algorithm.name === "ECDSA" && algorithm.namedCurve === "P-384"
                ? 96
                : 64
            )
          }
        }
      }).pipe(Effect.provide(layer)))

    it.effect("matches the RFC 8032 Ed25519 empty-message vector", () =>
      Effect.gen(function*() {
        const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"))
        const algorithm: Crypto.KeyPairAlgorithm = { name: "Ed25519" }
        const privateKey = yield* Crypto.importKey(
          "pkcs8",
          bytes(
            "302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
          ),
          algorithm
        )
        const publicKey = yield* Crypto.importKey(
          "spki",
          bytes(
            "302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
          ),
          algorithm
        )
        const expected = bytes(
          "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555f" +
            "b8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
        )
        const data = new Uint8Array()
        assert.deepStrictEqual(yield* Crypto.sign(algorithm, privateKey, data), expected)
        assert.strictEqual(yield* Crypto.verify(algorithm, publicKey, expected, data), true)
        assert.strictEqual(yield* Crypto.verify(algorithm, publicKey, new Uint8Array(63), data), false)
        assert.deepStrictEqual(
          yield* Crypto.exportKey("raw", publicKey),
          bytes("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")
        )
        const wrongFormat = yield* Effect.flip(Crypto.exportKey("pkcs8", publicKey))
        assert.strictEqual(wrongFormat.reason._tag, "BadArgument")
      }).pipe(Effect.provide(layer)))

    it.effect("matches the RFC 7748 X25519 vector and agrees on generated pairs", () =>
      Effect.gen(function*() {
        const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"))
        // RFC 7748 section 6.1, with the private scalars wrapped in PKCS8.
        const pkcs8 = (scalar: string) => bytes("302e020100300506032b656e04220420" + scalar)
        const algorithm: Crypto.KeyPairAlgorithm = { name: "X25519" }
        const alicePrivate = yield* Crypto.importKey(
          "pkcs8",
          pkcs8("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a"),
          algorithm
        )
        const bobPrivate = yield* Crypto.importKey(
          "pkcs8",
          pkcs8("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb"),
          algorithm
        )
        const alicePublic = yield* Crypto.importKey(
          "raw",
          slice(bytes("8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")),
          algorithm
        )
        const bobPublic = yield* Crypto.importKey(
          "raw",
          slice(bytes("de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f")),
          algorithm
        )
        assert.strictEqual(alicePrivate.type, "private")
        assert.deepStrictEqual(alicePrivate.usages, ["deriveBits"])
        assert.strictEqual(bobPublic.type, "public")
        assert.deepStrictEqual(bobPublic.usages, [])
        const expected = "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742"
        assert.strictEqual(hex(yield* Crypto.deriveSharedSecret(alicePrivate, bobPublic)), expected)
        assert.strictEqual(hex(yield* Crypto.deriveSharedSecret(bobPrivate, alicePublic)), expected)

        const alice = yield* Crypto.generateKeyPair(algorithm)
        const bob = yield* Crypto.generateKeyPair(algorithm)
        assert.deepStrictEqual(alice.privateKey.algorithm, { name: "X25519" })
        assert.deepStrictEqual(alice.privateKey.usages, ["deriveBits"])
        assert.deepStrictEqual(alice.publicKey.usages, [])
        const raw = yield* Crypto.exportKey("raw", bob.publicKey)
        assert.strictEqual(raw.length, 32)
        const received = yield* Crypto.importKey("raw", raw, algorithm)
        assert.deepStrictEqual(yield* Crypto.exportKey("raw", received), raw)
        assert.deepStrictEqual(
          yield* Crypto.exportKey("spki", received),
          yield* Crypto.exportKey("spki", bob.publicKey)
        )
        const secret = yield* Crypto.deriveSharedSecret(alice.privateKey, received)
        assert.strictEqual(secret.length, 32)
        assert.deepStrictEqual(yield* Crypto.deriveSharedSecret(bob.privateKey, alice.publicKey), secret)

        // A small-order point yields an all-zero secret, which RFC 7748 requires rejecting.
        const smallOrder = yield* Crypto.importKey("raw", new Uint8Array(32), algorithm)
        const error = yield* Effect.flip(Crypto.deriveSharedSecret(alice.privateKey, smallOrder))
        assert.strictEqual(error.reason.method, "deriveSharedSecret")
      }).pipe(Effect.provide(layer)))

    it.effect("agrees on full-length ECDH secrets for every curve", () =>
      Effect.gen(function*() {
        for (
          const [namedCurve, pointLength, secretLength] of [
            ["P-256", 65, 32],
            ["P-384", 97, 48],
            ["P-521", 133, 66]
          ] as const
        ) {
          const algorithm: Crypto.KeyPairAlgorithm = { name: "ECDH", namedCurve }
          const alice = yield* Crypto.generateKeyPair(algorithm, { extractable: true })
          const bob = yield* Crypto.generateKeyPair(algorithm)
          assert.deepStrictEqual(alice.privateKey.algorithm, algorithm)
          assert.deepStrictEqual(alice.privateKey.usages, ["deriveBits"])
          assert.deepStrictEqual(alice.publicKey.usages, [])
          const raw = yield* Crypto.exportKey("raw", bob.publicKey)
          assert.strictEqual(raw.length, pointLength)
          assert.strictEqual(raw[0], 0x04)
          const received = yield* Crypto.importKey("raw", slice(raw), algorithm)
          assert.deepStrictEqual(yield* Crypto.exportKey("raw", received), raw)
          const secret = yield* Crypto.deriveSharedSecret(alice.privateKey, received)
          assert.strictEqual(secret.length, secretLength)
          assert.deepStrictEqual(yield* Crypto.deriveSharedSecret(bob.privateKey, alice.publicKey), secret)
          if (typeof NativeCrypto.diffieHellman === "function") {
            const native = NativeCrypto.diffieHellman({
              privateKey: createPrivateKey({
                key: Buffer.from(yield* Crypto.exportKey("pkcs8", alice.privateKey)),
                format: "der",
                type: "pkcs8"
              }),
              publicKey: createPublicKey({
                key: Buffer.from(yield* Crypto.exportKey("spki", bob.publicKey)),
                format: "der",
                type: "spki"
              })
            })
            assert.strictEqual(hex(secret), native.toString("hex"))
          }
        }
      }).pipe(Effect.provide(layer)))

    it.effect("rejects key agreement between mismatched or unsuitable keys", () =>
      Effect.gen(function*() {
        const p256 = yield* Crypto.generateKeyPair({ name: "ECDH", namedCurve: "P-256" })
        const p384 = yield* Crypto.generateKeyPair({ name: "ECDH", namedCurve: "P-384" })
        const x25519 = yield* Crypto.generateKeyPair({ name: "X25519" })
        const ed25519 = yield* Crypto.generateKeyPair({ name: "Ed25519" })
        const aes = yield* Crypto.generateSecretKey({ name: "AES-CTR", length: 128 })
        for (
          const [privateKey, publicKey] of [
            [p256.privateKey, p384.publicKey],
            [x25519.privateKey, p256.publicKey],
            [p256.privateKey, x25519.publicKey],
            [p256.publicKey, p256.publicKey],
            [p256.privateKey, p256.privateKey],
            [ed25519.privateKey, ed25519.publicKey],
            [aes, aes]
          ]
        ) {
          const error = yield* Effect.flip(Crypto.deriveSharedSecret(privateKey, publicKey))
          assert.strictEqual(error.reason._tag, "BadArgument")
          assert.strictEqual(error.reason.method, "deriveSharedSecret")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("imports and exports raw ECDSA public keys", () =>
      Effect.gen(function*() {
        const algorithm: Crypto.KeyPairAlgorithm = { name: "ECDSA", namedCurve: "P-256" }
        const pair = yield* Crypto.generateKeyPair(algorithm)
        const raw = yield* Crypto.exportKey("raw", pair.publicKey)
        assert.strictEqual(raw.length, 65)
        const imported = yield* Crypto.importKey("raw", raw, algorithm)
        assert.strictEqual(imported.type, "public")
        assert.deepStrictEqual(imported.usages, ["verify"])
        const data = Uint8Array.of(1, 2, 3)
        const signature = yield* Crypto.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, data)
        assert.strictEqual(yield* Crypto.verify({ name: "ECDSA", hash: "SHA-256" }, imported, signature, data), true)
      }).pipe(Effect.provide(layer)))

    it.effect("matches the NIST SP 800-38A AES-CTR vectors", () =>
      Effect.gen(function*() {
        const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"))
        const counter = bytes("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff")
        const plaintext = bytes(
          "6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51" +
            "30c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710"
        )
        for (
          const [length, key, expected] of [
            [
              128,
              "2b7e151628aed2a6abf7158809cf4f3c",
              "874d6191b620e3261bef6864990db6ce9806f66b7970fdff8617187bb9fffdff" +
              "5ae4df3edbd5d35e5b4f09020db03eab1e031dda2fbe03d1792170a0f3009cee"
            ],
            [
              256,
              "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4",
              "601ec313775789a5b7a7f504bbf3d228f443e3ca4d62b59aca84e990cacaf5c5" +
              "2b0930daa23de94ce87017ba2d84988ddfc9c58db67aada613c2dd08457941a6"
            ]
          ] as const
        ) {
          const imported = yield* Crypto.importKey("raw", slice(bytes(key)), { name: "AES-CTR", length })
          assert.deepStrictEqual(imported.algorithm, { name: "AES-CTR", length })
          assert.deepStrictEqual(imported.usages, ["encrypt", "decrypt"])
          const options: Crypto.CipherOptions = { name: "AES-CTR", counter: slice(counter), length: 128 }
          const ciphertext = yield* Crypto.encrypt(options, imported, slice(plaintext))
          assert.strictEqual(hex(ciphertext), expected)
          assert.deepStrictEqual(yield* Crypto.decrypt(options, imported, slice(ciphertext)), plaintext)
          // Each call starts from the supplied counter block.
          assert.deepStrictEqual(yield* Crypto.encrypt(options, imported, plaintext), ciphertext)
          assert.deepStrictEqual(yield* Crypto.decrypt(options, imported, plaintext), ciphertext)
        }
      }).pipe(Effect.provide(layer)))

    it.effect("interoperates with native AES-CTR for partial blocks and wraps only the counter bits", () =>
      Effect.gen(function*() {
        const raw = Uint8Array.from({ length: 16 }, (_, i) => i * 7)
        const key = yield* Crypto.importKey("raw", raw, { name: "AES-CTR", length: 128 })
        const counter = Uint8Array.from({ length: 16 }, (_, i) => 0xf0 + i)
        for (const size of [0, 1, 15, 16, 17, 33, 100]) {
          const data = Uint8Array.from({ length: size }, (_, i) => (i * 31) & 0xff)
          const native = createCipheriv("aes-128-ctr", raw, counter)
          const expected = Buffer.concat([native.update(data), native.final()])
          const ciphertext = yield* Crypto.encrypt({ name: "AES-CTR", counter, length: 128 }, key, data)
          assert.strictEqual(hex(ciphertext), expected.toString("hex"))
          assert.deepStrictEqual(
            yield* Crypto.decrypt({ name: "AES-CTR", counter, length: 128 }, key, ciphertext),
            data
          )
        }
        // With a 32-bit counter, block 0x..ffffffff is followed by 0x..00000000
        // without carrying into the nonce bytes.
        const high = new Uint8Array(16).fill(0xab)
        high.fill(0xff, 12)
        const low = high.slice()
        low.fill(0x00, 12)
        const zeros = new Uint8Array(32)
        const wrapped = yield* Crypto.encrypt({ name: "AES-CTR", counter: high, length: 32 }, key, zeros)
        const restarted = yield* Crypto.encrypt({ name: "AES-CTR", counter: low, length: 32 }, key, zeros)
        assert.deepStrictEqual(wrapped.subarray(16), restarted.subarray(0, 16))
      }).pipe(Effect.provide(layer)))

    it.effect("generates AES-CTR keys and validates counter parameters", () =>
      Effect.gen(function*() {
        const key = yield* Crypto.generateSecretKey({ name: "AES-CTR", length: 256 }, { extractable: true })
        assert.deepStrictEqual(key.algorithm, { name: "AES-CTR", length: 256 })
        assert.deepStrictEqual(key.usages, ["encrypt", "decrypt"])
        assert.strictEqual((yield* Crypto.exportKey("raw", key)).length, 32)
        const data = new Uint8Array(5)
        for (
          const [counter, length] of [
            [new Uint8Array(15), 128],
            [new Uint8Array(17), 128],
            [new Uint8Array(16), 0],
            [new Uint8Array(16), 129],
            [new Uint8Array(16), 1.5],
            [new Uint8Array(16), NaN]
          ] as const
        ) {
          for (const [method, operation] of [["encrypt", Crypto.encrypt], ["decrypt", Crypto.decrypt]] as const) {
            const error = yield* Effect.flip(operation({ name: "AES-CTR", counter, length }, key, data))
            assert.strictEqual(error.reason._tag, "BadArgument")
            assert.strictEqual(error.reason.method, method)
          }
        }
        const mismatched = yield* Effect.flip(
          Crypto.importKey("raw", new Uint8Array(16), { name: "AES-CTR", length: 256 })
        )
        assert.strictEqual(mismatched.reason._tag, "BadArgument")
      }).pipe(Effect.provide(layer)))

    it.effect("reports malformed key material and mismatched algorithms as typed failures", () =>
      Effect.gen(function*() {
        const aes = yield* Crypto.generateSecretKey({ name: "AES-GCM", length: 128 })
        const rsa = yield* Crypto.generateKeyPair({ name: "RSA-PSS", hash: "SHA-256" })
        const operations: ReadonlyArray<
          readonly [
            string,
            Effect.Effect<unknown, PlatformError.PlatformError, Crypto.Crypto>
          ]
        > = [
          ["importKey", Crypto.importKey("raw", new Uint8Array(16), { name: "AES-GCM", length: 256 })],
          ["importKey", Crypto.importKey("raw", new Uint8Array(), { name: "HMAC", hash: "SHA-256" })],
          ["importKey", Crypto.importKey("spki", Uint8Array.of(0, 1, 2), { name: "Ed25519" })],
          ["importKey", Crypto.importKey("raw", new Uint8Array(32), { name: "RSA-PSS", hash: "SHA-256" })],
          ["importKey", Crypto.importKey("spki", new Uint8Array(16), { name: "AES-CTR", length: 128 })],
          ["generateSecretKey", Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256", length: 1 })],
          ["generateSecretKey", Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256", length: 2 ** 32 + 256 })],
          [
            "generateKeyPair",
            Crypto.generateKeyPair({ name: "RSA-PSS", hash: "SHA-256", modulusLength: 2 ** 32 + 2048 })
          ],
          ["sign", Crypto.sign({ name: "HMAC" }, aes, new Uint8Array())],
          ["encrypt", Crypto.encrypt({ name: "RSA-OAEP" }, aes, new Uint8Array())],
          ["exportKey", Crypto.exportKey("spki", aes)],
          ["exportKey", Crypto.exportKey("raw", rsa.publicKey)]
        ]
        for (const [method, operation] of operations) {
          const error = yield* Effect.flip(operation)
          assert.strictEqual(error._tag, "PlatformError")
          assert.strictEqual(error.reason.module, "Crypto")
          assert.strictEqual(error.reason.method, method)
        }
      }).pipe(Effect.provide(layer)))
  })
}
