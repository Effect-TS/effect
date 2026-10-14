import { Jwe, Jwk, Jwks, Jws } from "@effect/jose"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { Aes, CryptoError, Ecdsa, Ed25519, Hmac, Rsa, SecureRandom, WebCrypto } from "effect/crypto"
import * as Base64Url from "effect/encoding/Base64Url"
import { cryptoLayer, privateJwk, publicJwk, secretJwk, utf8 } from "./fixtures.ts"

for (const algorithm of ["RS256", "PS256", "ES256", "EdDSA"] as const) {
  it.effect(`uses injected services for ${algorithm} generation, signing and key-set verification`, () =>
    Effect.gen(function*() {
      const rsa = yield* Rsa.Rsa
      const ecdsa = yield* Ecdsa.Ecdsa
      const ed25519 = yield* Ed25519.Ed25519
      const calls: Array<string> = []
      const privateInputs: Array<Uint8Array> = []
      const program = Effect.gen(function*() {
        const pair = yield* Jwk.generateKeyPair({ algorithm })
        const key = yield* Jwk.importPrivate(pair.privateKey, algorithm)
        const token = yield* Jws.sign(Redacted.make(utf8("provider")), key, { alg: algorithm })
        const verified = yield* Jws.verifyWithKeySet(token, { algorithms: [algorithm] }).pipe(
          Effect.provide(Jwks.layerLocal({ keys: [pair.publicKey] }))
        )
        assert.deepStrictEqual(Redacted.value(verified.payload), utf8("provider"))
        assert.isTrue(Redacted.value(key.material).some((byte) => byte !== 0))
      })
      yield* program.pipe(
        Effect.provideService(Rsa.Rsa, {
          ...rsa,
          generateKeyPair(options) {
            calls.push("RSA.generate")
            assert.strictEqual(options?.modulusLength, 2048)
            return rsa.generateKeyPair(options)
          },
          signPss(options) {
            calls.push("PS256.sign")
            assert.strictEqual(options.hash, "SHA-256")
            assert.strictEqual(options.saltLength, 32)
            privateInputs.push(Redacted.value(options.privateKey))
            return rsa.signPss(options)
          },
          verifyPss(options) {
            calls.push("PS256.verify")
            assert.strictEqual(options.hash, "SHA-256")
            assert.strictEqual(options.saltLength, 32)
            return rsa.verifyPss(options)
          },
          signPkcs1v15(options) {
            calls.push("RS256.sign")
            assert.strictEqual(options.hash, "SHA-256")
            privateInputs.push(Redacted.value(options.privateKey))
            return rsa.signPkcs1v15(options)
          },
          verifyPkcs1v15(options) {
            calls.push("RS256.verify")
            assert.strictEqual(options.hash, "SHA-256")
            return rsa.verifyPkcs1v15(options)
          }
        }),
        Effect.provideService(Ecdsa.Ecdsa, {
          ...ecdsa,
          generateKeyPair(options) {
            calls.push("ES256.generate")
            assert.strictEqual(options.curve, "P-256")
            return ecdsa.generateKeyPair(options)
          },
          sign(options) {
            calls.push("ES256.sign")
            assert.strictEqual(options.curve, "P-256")
            assert.strictEqual(options.hash, "SHA-256")
            privateInputs.push(Redacted.value(options.privateKey))
            return ecdsa.sign(options)
          },
          verify(options) {
            calls.push("ES256.verify")
            assert.strictEqual(options.curve, "P-256")
            assert.strictEqual(options.hash, "SHA-256")
            assert.strictEqual(options.signature.length, 64)
            return ecdsa.verify(options)
          }
        }),
        Effect.provideService(Ed25519.Ed25519, {
          ...ed25519,
          generateKeyPair() {
            calls.push("EdDSA.generate")
            return ed25519.generateKeyPair()
          },
          sign(options) {
            calls.push("EdDSA.sign")
            privateInputs.push(Redacted.value(options.privateKey))
            return ed25519.sign(options)
          },
          verify(options) {
            calls.push("EdDSA.verify")
            assert.strictEqual(options.signature.length, 64)
            return ed25519.verify(options)
          }
        })
      )
      const generation = algorithm === "RS256" || algorithm === "PS256" ? "RSA" : algorithm
      assert.deepStrictEqual(calls, [`${generation}.generate`, `${algorithm}.sign`, `${algorithm}.verify`])
      assert.lengthOf(privateInputs, 1)
      assert.isTrue(privateInputs[0].every((byte) => byte === 0))
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect("uses injected HMAC operations with owned keys and SHA-256", () =>
  Effect.gen(function*() {
    const hmac = yield* Hmac.Hmac
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const original = Redacted.value(key.material).slice()
    const inputs: Array<Uint8Array> = []
    const calls: Array<string> = []
    yield* Effect.gen(function*() {
      const token = yield* Jws.sign(Redacted.make(utf8("provider")), key, { alg: "HS256" })
      const verified = yield* Jws.verify(token, key, { algorithms: ["HS256"] })
      assert.deepStrictEqual(Redacted.value(verified.payload), utf8("provider"))
    }).pipe(Effect.provideService(Hmac.Hmac, {
      ...hmac,
      compute(options) {
        calls.push("compute")
        assert.strictEqual(options.hash, "SHA-256")
        inputs.push(Redacted.value(options.key))
        assert.notStrictEqual(inputs[0], Redacted.value(key.material))
        return hmac.compute(options)
      },
      verify(options) {
        calls.push("verify")
        assert.strictEqual(options.hash, "SHA-256")
        inputs.push(Redacted.value(options.key))
        return hmac.verify(options)
      }
    }))
    assert.deepStrictEqual(calls, ["compute", "verify"])
    assert.isTrue(inputs.every((input) => input.every((byte) => byte === 0)))
    assert.deepStrictEqual(Redacted.value(key.material), original)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("uses injected AES-GCM and SecureRandom with owned plaintext, keys and a 96-bit IV", () =>
  Effect.gen(function*() {
    const aes = yield* Aes.Aes
    const random = yield* SecureRandom.SecureRandom
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const plaintext = utf8("provider")
    const nonce = new Uint8Array(12).fill(9)
    const keys: Array<Uint8Array> = []
    let ownedPlaintext: Uint8Array | undefined
    const calls: Array<string> = []
    yield* Effect.gen(function*() {
      const token = yield* Jwe.encrypt(Redacted.make(plaintext), key, { alg: "dir", enc: "A256GCM" })
      const parts = Redacted.value(token).split(".")
      assert.strictEqual(parts[2], Base64Url.encode(nonce))
      assert.lengthOf(yield* Effect.fromResult(Base64Url.decode(parts[4])), 16)
      const decrypted = yield* Jwe.decrypt(token, key)
      assert.deepStrictEqual(Redacted.value(decrypted.plaintext), plaintext)
    }).pipe(
      Effect.provideService(SecureRandom.SecureRandom, {
        ...random,
        randomBytes(size) {
          calls.push("random")
          assert.strictEqual(size, 12)
          return Effect.succeed(nonce)
        }
      }),
      Effect.provideService(Aes.Aes, {
        ...aes,
        encryptGcm(options) {
          calls.push("encrypt")
          ownedPlaintext = options.data
          assert.notStrictEqual(options.data, plaintext)
          assert.notStrictEqual(options.nonce, nonce)
          assert.strictEqual(Redacted.value(options.key).length, 32)
          keys.push(Redacted.value(options.key))
          assert.isDefined(options.additionalData)
          return aes.encryptGcm(options)
        },
        decryptGcm(options) {
          calls.push("decrypt")
          keys.push(Redacted.value(options.key))
          assert.strictEqual(Redacted.value(options.key).length, 32)
          return aes.decryptGcm(options)
        }
      })
    )
    assert.deepStrictEqual(calls, ["random", "encrypt", "decrypt"])
    assert.isTrue(keys.every((input) => input.every((byte) => byte === 0)))
    assert.isTrue(ownedPlaintext?.every((byte) => byte === 0))
    assert.deepStrictEqual(plaintext, utf8("provider"))
    assert.isTrue(Redacted.value(key.material).some((byte) => byte !== 0))
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("routes key helpers and algorithm layers through the injected WebCrypto backend", () =>
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtleCrypto
    const key = yield* Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
    const calls: Array<string> = []
    const backend = new Proxy(subtle, {
      get(target, name) {
        const value = Reflect.get(target, name, target)
        if (typeof value !== "function") return value
        return (...args: Array<unknown>) => {
          calls.push(String(name))
          return Reflect.apply(value, target, args)
        }
      }
    })
    const layer = Layer.mergeAll(Hmac.layer, Ecdsa.layer, Rsa.layer, Ed25519.layer, Aes.layer).pipe(
      Layer.provideMerge(Layer.succeed(WebCrypto.SubtleCrypto, backend)),
      Layer.fresh
    )
    yield* Effect.gen(function*() {
      yield* Jwk.importPublic(publicJwk, "ES256")
      assert.deepStrictEqual(calls, ["importKey", "exportKey", "importKey", "exportKey"])
      calls.length = 0
      yield* Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
      assert.deepStrictEqual(calls, ["importKey", "exportKey"])
      calls.length = 0
      yield* Jwk.importPkcs8(key.material, "ES256")
      assert.deepStrictEqual(calls, ["importKey", "exportKey", "importKey", "exportKey", "importKey", "exportKey"])
      calls.length = 0
      yield* Jwk.generateKeyPair({ algorithm: "ES256" })
      assert.deepStrictEqual(calls, ["generateKey", "exportKey", "exportKey", "importKey", "exportKey"])
      calls.length = 0
      const secret = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
      assert.deepStrictEqual(calls, ["importKey", "exportKey"])
      calls.length = 0
      const token = yield* Jws.sign(Redacted.make(utf8("backend")), secret, { alg: "HS256" })
      yield* Jws.verify(token, secret, { algorithms: ["HS256"] })
      assert.deepStrictEqual(calls, ["importKey", "sign", "importKey", "verify"])
      calls.length = 0
      const encryption = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
      const encrypted = yield* Jwe.encrypt(Redacted.make(utf8("backend")), encryption, { alg: "dir", enc: "A256GCM" })
      yield* Jwe.decrypt(encrypted, encryption)
      assert.deepStrictEqual(calls, ["importKey", "exportKey", "importKey", "encrypt", "importKey", "decrypt"])
    }).pipe(Effect.provide(layer))
  }).pipe(Effect.provide(cryptoLayer)))

for (
  const [reason, tag] of [
    [new CryptoError.InvalidKey({ description: "secret-canary", cause: "secret-canary" }), "CryptoInvalidInput"],
    [
      new CryptoError.Unsupported({ description: "secret-canary", cause: "secret-canary" }),
      "CryptoUnsupportedAlgorithm"
    ],
    [new CryptoError.Unknown({ description: "secret-canary", cause: "secret-canary" }), "CryptoUnavailable"],
    [
      new CryptoError.BadArgument({ description: "secret-canary", cause: new SyntaxError("secret-canary") }),
      "CryptoInvalidInput"
    ]
  ] as const
) {
  it.effect(`sanitizes injected ${reason._tag} failures before exposing ${tag}`, () =>
    Effect.gen(function*() {
      const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
      const hmac = yield* Hmac.Hmac
      const error = yield* Jws.sign(Redacted.make(utf8("payload")), key, { alg: "HS256" }).pipe(
        Effect.provideService(Hmac.Hmac, {
          ...hmac,
          compute: () => Effect.fail(new CryptoError.CryptoError({ algorithm: "HMAC", method: "compute", reason }))
        }),
        Effect.flip
      )
      assert.strictEqual(error._tag, tag)
      assert.notInclude(JSON.stringify(error), "secret-canary")
      assert.notInclude(String(error), "secret-canary")
      assert.notProperty(error, "cause")
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect("sanitizes authentication failures from the injected AES service", () =>
  Effect.gen(function*() {
    const aes = yield* Aes.Aes
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const token = yield* Jwe.encrypt(Redacted.make(utf8("plaintext")), key, { alg: "dir", enc: "A256GCM" })
    const error = yield* Jwe.decrypt(token, key).pipe(
      Effect.provideService(Aes.Aes, {
        ...aes,
        decryptGcm: () =>
          Effect.fail(
            new CryptoError.CryptoError({
              algorithm: "AES-GCM",
              method: "decryptGcm",
              reason: new CryptoError.AuthenticationFailed({ description: "secret-canary", cause: "secret-canary" })
            })
          )
      }),
      Effect.flip
    )
    assert.strictEqual(error._tag, "JoseDecryptionFailed")
    assert.notInclude(JSON.stringify(error), "secret-canary")
    assert.notProperty(error, "cause")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("classifies deferred EC point rejection without exposing backend diagnostics", () =>
  Effect.gen(function*() {
    const subtle = yield* WebCrypto.subtleCrypto
    const backend = new Proxy(subtle, {
      get(target, name) {
        const value = Reflect.get(target, name, target)
        if (typeof value !== "function") return value
        return (...args: Array<unknown>) => {
          if (name === "exportKey" && args[0] === "spki") {
            return Promise.reject(new DOMException("secret-canary", "OperationError"))
          }
          return Reflect.apply(value, target, args)
        }
      }
    })
    const error = yield* Jwk.importPublic(publicJwk, "ES256").pipe(
      Effect.provideService(WebCrypto.SubtleCrypto, backend),
      Effect.flip
    )
    assert.strictEqual(error._tag, "JoseInvalidKey")
    assert.notInclude(JSON.stringify(error), "secret-canary")
    assert.notProperty(error, "cause")
  }).pipe(Effect.provide(cryptoLayer)))
