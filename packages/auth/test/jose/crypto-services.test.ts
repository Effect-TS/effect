import { JoseError, Jwe, Jwk, Jwks, Jws } from "@effect/auth/jose"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { Aead, CryptoError, Digest, Mac, SecureRandom, Signature, WebCrypto } from "effect/crypto"
import * as Base64Url from "effect/encoding/Base64Url"
import { webCryptoLayer, withSubtle } from "../utils/crypto.ts"
import { cryptoLayer, privateJwk, publicJwk, secretJwk, utf8 } from "./fixtures.ts"

for (const algorithm of ["RS256", "PS256", "ES256", "EdDSA"] as const) {
  it.effect(`uses injected services for ${algorithm} generation, signing and key-set verification`, () =>
    Effect.gen(function*() {
      const signature = yield* Signature.Signature
      const calls: Array<string> = []
      const expected = algorithm === "RS256"
        ? Signature.rsaPkcs1v15({ hash: Digest.sha256, modulusLength: 2048 })
        : algorithm === "PS256"
        ? Signature.rsaPss({ hash: Digest.sha256, modulusLength: 2048, saltLength: 32 })
        : algorithm === "ES256"
        ? Signature.ecdsaP256
        : Signature.ed25519
      const program = Effect.gen(function*() {
        const pair = yield* Jwk.generateKeyPair({ algorithm })
        const key = yield* Jwk.importPrivate(pair.privateKey, algorithm)
        const original = Redacted.value(key.material).slice()
        const token = yield* Jws.sign(Redacted.make(utf8("provider")), key, { alg: algorithm })
        const verified = yield* Jws.verifyWithKeySet(token, { algorithms: [algorithm] }).pipe(
          Effect.provide(Jwks.layerLocal({ keys: [pair.publicKey] }))
        )
        assert.deepStrictEqual(Redacted.value(verified.payload), utf8("provider"))
        assert.deepStrictEqual(Redacted.value(key.material), original)
      })
      yield* program.pipe(
        Effect.provideService(Signature.Signature, {
          ...signature,
          generateKeyPair(algorithm) {
            calls.push("generate")
            assert.deepStrictEqual<Signature.Algorithm>(algorithm, expected)
            return signature.generateKeyPair(algorithm)
          },
          sign(key, data) {
            calls.push("sign")
            assert.deepStrictEqual(key.algorithm, expected)
            return signature.sign(key, data)
          },
          verify(key, signatureBytes, data) {
            calls.push("verify")
            assert.deepStrictEqual(key.algorithm, expected)
            if (algorithm === "ES256" || algorithm === "EdDSA") assert.lengthOf(signatureBytes, 64)
            return signature.verify(key, signatureBytes, data)
          }
        })
      )
      assert.deepStrictEqual(calls, ["generate", "sign", "verify"])
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect("uses injected HMAC operations with isolated keys and SHA-256", () =>
  Effect.gen(function*() {
    const mac = yield* Mac.Mac
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const original = Redacted.value(key.material).slice()
    const calls: Array<string> = []
    yield* Effect.gen(function*() {
      const token = yield* Jws.sign(Redacted.make(utf8("provider")), key, { alg: "HS256" })
      const verified = yield* Jws.verify(token, key, { algorithms: ["HS256"] })
      assert.deepStrictEqual(Redacted.value(verified.payload), utf8("provider"))
    }).pipe(Effect.provideService(Mac.Mac, {
      ...mac,
      sign: Effect.fnUntraced(function*(input, data) {
        calls.push("sign")
        assert.strictEqual(input.algorithm, Mac.hmacSha256)
        const bytes = yield* Mac.toBytes(input)
        assert.notStrictEqual(bytes, Redacted.value(key.material))
        assert.deepStrictEqual(bytes, original)
        return yield* mac.sign(input, data)
      }),
      verify: Effect.fnUntraced(function*(input, tag, data) {
        calls.push("verify")
        assert.strictEqual(input.algorithm, Mac.hmacSha256)
        assert.deepStrictEqual(yield* Mac.toBytes(input), original)
        return yield* mac.verify(input, tag, data)
      })
    }))
    assert.deepStrictEqual(calls, ["sign", "verify"])
    assert.deepStrictEqual(Redacted.value(key.material), original)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("uses injected AES-GCM and SecureRandom with owned plaintext, isolated keys and a 96-bit IV", () =>
  Effect.gen(function*() {
    const aead = yield* Aead.Aead
    const random = yield* SecureRandom.SecureRandom
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const original = Redacted.value(key.material).slice()
    const plaintext = utf8("provider")
    const nonce = new Uint8Array(12).fill(9)
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
      Effect.provideService(Aead.Aead, {
        ...aead,
        encrypt: Effect.fnUntraced(function*(input, data, options) {
          calls.push("encrypt")
          ownedPlaintext = data
          assert.notStrictEqual(data, plaintext)
          assert.notStrictEqual(options.nonce, nonce)
          assert.strictEqual(input.algorithm, Aead.aes256Gcm)
          assert.deepStrictEqual(yield* Aead.toBytes(input), original)
          assert.isDefined(options.aad)
          return yield* aead.encrypt(input, data, options)
        }),
        decrypt: Effect.fnUntraced(function*(input, data, options) {
          calls.push("decrypt")
          assert.strictEqual(input.algorithm, Aead.aes256Gcm)
          assert.deepStrictEqual(yield* Aead.toBytes(input), original)
          return yield* aead.decrypt(input, data, options)
        })
      })
    )
    assert.deepStrictEqual(calls, ["random", "encrypt", "decrypt"])
    assert.isTrue(ownedPlaintext?.every((byte) => byte === 0))
    assert.deepStrictEqual(plaintext, utf8("provider"))
    assert.deepStrictEqual(Redacted.value(key.material), original)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("routes key helpers and algorithm layers through the injected WebCrypto backend", () =>
  Effect.gen(function*() {
    const crypto = yield* WebCrypto.WebCrypto
    const subtle = crypto.subtle
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
    const layer = webCryptoLayer.pipe(
      Layer.provideMerge(WebCrypto.layer(withSubtle(crypto, backend))),
      Layer.fresh
    )
    yield* Effect.gen(function*() {
      for (
        const imported of [
          Jwk.importPublic(publicJwk, "ES256"),
          Jwk.importPrivate(Redacted.make(privateJwk), "ES256"),
          Jwk.importPkcs8(key.material, "ES256")
        ]
      ) {
        yield* imported
        assert.include(calls, "importKey")
        assert.include(calls, "exportKey")
        calls.length = 0
      }
      yield* Jwk.generateKeyPair({ algorithm: "ES256" })
      assert.include(calls, "generateKey")
      assert.include(calls, "exportKey")
      calls.length = 0
      const secret = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
      assert.deepStrictEqual(calls, [])
      calls.length = 0
      const token = yield* Jws.sign(Redacted.make(utf8("backend")), secret, { alg: "HS256" })
      yield* Jws.verify(token, secret, { algorithms: ["HS256"] })
      assert.deepStrictEqual(calls, ["importKey", "sign", "importKey", "verify"])
      calls.length = 0
      const encryption = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
      const encrypted = yield* Jwe.encrypt(Redacted.make(utf8("backend")), encryption, { alg: "dir", enc: "A256GCM" })
      yield* Jwe.decrypt(encrypted, encryption)
      assert.deepStrictEqual(calls, ["importKey", "encrypt", "importKey", "decrypt"])
    }).pipe(Effect.provide(layer))
  }).pipe(Effect.provide(cryptoLayer)))

for (
  const [reason, tag] of [
    [new CryptoError.InvalidKey({ description: "secret-canary", cause: "secret-canary" }), "JoseInvalidInput"],
    [
      new CryptoError.Unsupported({ description: "secret-canary", cause: "secret-canary" }),
      "JoseUnsupportedAlgorithm"
    ],
    [new CryptoError.NotExtractable({ description: "secret-canary", cause: "secret-canary" }), "JoseCryptoUnavailable"],
    [
      new CryptoError.InvalidArgument({ description: "secret-canary", cause: new SyntaxError("secret-canary") }),
      "JoseInvalidInput"
    ]
  ] as const
) {
  it.effect(`sanitizes injected ${reason._tag} failures before exposing ${tag}`, () =>
    Effect.gen(function*() {
      const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
      const mac = yield* Mac.Mac
      const error = yield* Jws.sign(Redacted.make(utf8("payload")), key, { alg: "HS256" }).pipe(
        Effect.provideService(Mac.Mac, {
          ...mac,
          sign: () => Effect.fail(new CryptoError.CryptoError({ module: "Mac", method: "sign", reason }))
        }),
        Effect.flip
      )
      assert.strictEqual(error._tag, tag)
      assert.notInclude(JSON.stringify(error), "secret-canary")
      assert.notInclude(String(error), "secret-canary")
      assert.notProperty(error, "cause")
    }).pipe(Effect.provide(cryptoLayer)))
}

it.effect.each([
  {
    name: "unsupported",
    cause: new DOMException("secret-canary", "NotSupportedError"),
    error: JoseError.UnsupportedAlgorithm
  },
  { name: "unavailable", cause: new Error("secret-canary"), error: JoseError.CryptoUnavailable }
])(
  "preserves $name key import failures across serialization formats",
  ({ cause, error: ErrorClass }) =>
    Effect.gen(function*() {
      const crypto = yield* WebCrypto.WebCrypto
      const subtle = crypto.subtle
      const key = yield* Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
      const backend = new Proxy(subtle, {
        get(target, name) {
          if (name === "importKey") return () => Promise.reject(cause)
          const value = Reflect.get(target, name, target)
          return typeof value === "function" ? value.bind(target) : value
        }
      })
      const imports: ReadonlyArray<Effect.Effect<unknown, JoseError.KeyError>> = [
        Jwk.importPublic(publicJwk, "ES256"),
        Jwk.importPrivate(Redacted.make(privateJwk), "ES256"),
        Jwk.importPkcs8(key.material, "ES256")
      ]

      for (const effect of imports) {
        const error = yield* effect.pipe(
          Effect.provideService(WebCrypto.WebCrypto, withSubtle(crypto, backend)),
          Effect.flip
        )
        assert.ok(error instanceof ErrorClass)
        assert.notInclude(JSON.stringify(error), "secret-canary")
        assert.notProperty(error, "cause")
      }
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("sanitizes authentication failures from the injected AES service", () =>
  Effect.gen(function*() {
    const aead = yield* Aead.Aead
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const token = yield* Jwe.encrypt(Redacted.make(utf8("plaintext")), key, { alg: "dir", enc: "A256GCM" })
    const error = yield* Jwe.decrypt(token, key).pipe(
      Effect.provideService(Aead.Aead, {
        ...aead,
        decrypt: () =>
          Effect.fail(
            new CryptoError.CryptoError({
              module: "Aead",
              method: "decrypt",
              reason: new CryptoError.DecryptionFailed()
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
    const crypto = yield* WebCrypto.WebCrypto
    const subtle = crypto.subtle
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
      Effect.provideService(WebCrypto.WebCrypto, withSubtle(crypto, backend)),
      Effect.flip
    )
    assert.strictEqual(error._tag, "JoseInvalidKey")
    assert.notInclude(JSON.stringify(error), "secret-canary")
    assert.notProperty(error, "cause")
  }).pipe(Effect.provide(cryptoLayer)))
