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
        const wrongFormat = yield* Effect.flip(Crypto.exportKey("raw", publicKey))
        assert.strictEqual(wrongFormat.reason._tag, "BadArgument")
      }).pipe(Effect.provide(layer)))

    it.effect("reports malformed key material and mismatched algorithms as typed failures", () =>
      Effect.gen(function*() {
        const aes = yield* Crypto.generateSecretKey({ name: "AES-GCM", length: 128 })
        const operations: ReadonlyArray<
          readonly [
            string,
            Effect.Effect<unknown, PlatformError.PlatformError, Crypto.Crypto>
          ]
        > = [
          ["importKey", Crypto.importKey("raw", new Uint8Array(16), { name: "AES-GCM", length: 256 })],
          ["importKey", Crypto.importKey("raw", new Uint8Array(), { name: "HMAC", hash: "SHA-256" })],
          ["importKey", Crypto.importKey("spki", Uint8Array.of(0, 1, 2), { name: "Ed25519" })],
          ["generateSecretKey", Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256", length: 1 })],
          ["generateSecretKey", Crypto.generateSecretKey({ name: "HMAC", hash: "SHA-256", length: 2 ** 32 + 256 })],
          [
            "generateKeyPair",
            Crypto.generateKeyPair({ name: "RSA-PSS", hash: "SHA-256", modulusLength: 2 ** 32 + 2048 })
          ],
          ["sign", Crypto.sign({ name: "HMAC" }, aes, new Uint8Array())],
          ["encrypt", Crypto.encrypt({ name: "RSA-OAEP" }, aes, new Uint8Array())],
          ["exportKey", Crypto.exportKey("spki", aes)]
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
