import { assert, it } from "@effect/vitest"
import { Digest, Signature } from "effect/crypto"
import * as Effect from "effect/Effect"
import { Jwe, Jwk, Jwks, Jws } from "effect/jose"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as jose from "jose"
import * as NodeCrypto from "node:crypto"
import { assertReason, es256PublicJwk, layer, rfc7515, rs256PublicJwk, secretJwk, utf8 } from "./utils.ts"

it.effect("generates algorithm-bound key pairs that import for signing and verification", () =>
  Effect.gen(function*() {
    for (const algorithm of ["RS256", "PS256", "ES256", "ES384", "ES512", "EdDSA"] as const) {
      const pair = yield* Jwk.generateKeyPair({ algorithm, kid: "k1" })
      assert.strictEqual(pair.publicKey.alg, algorithm)
      assert.strictEqual(pair.publicKey.kid, "k1")
      assert.strictEqual(pair.publicKey.use, "sig")
      assert.strictEqual(Redacted.value(pair.privateKey).use, "sig")
      assert.isFalse("d" in pair.publicKey)

      const privateKey = yield* Jwk.importPrivate(pair.privateKey, algorithm)
      const publicKey = yield* Jwk.importPublic(pair.publicKey, algorithm)
      assert.strictEqual(privateKey.algorithm, algorithm)
      assert.strictEqual(privateKey.kid, "k1")
      assert.strictEqual(publicKey.algorithm, algorithm)
      assert.strictEqual(publicKey.kid, "k1")
      assert.isTrue(Signature.isPrivateKey(privateKey.key))
      assert.isTrue(Signature.isPublicKey(publicKey.key))
      assert.deepStrictEqual(publicKey.jwk, pair.publicKey)
      assert.deepStrictEqual(yield* Jwk.exportPublic(publicKey), pair.publicKey)
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects padded base64url in every public JWK key member", () =>
  Effect.gen(function*() {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "EdDSA" })
    for (
      const { algorithm, jwk, members } of [
        { algorithm: "RS256", jwk: rs256PublicJwk, members: ["n", "e"] },
        { algorithm: "ES256", jwk: es256PublicJwk, members: ["x", "y"] },
        { algorithm: "EdDSA", jwk: pair.publicKey, members: ["x"] }
      ] as const
    ) {
      for (const member of members) {
        const invalid = { ...jwk, [member]: `${Reflect.get(jwk, member)}=` }
        assert.isFalse(Schema.is(Jwk.PublicJwk)(invalid))
        const error = yield* Jwk.importPublic(invalid, algorithm).pipe(Effect.flip)
        assertReason(error, "InvalidKey")
        assert.include(error.reason.description, "base64url")
        assert.isUndefined(error.reason.cause)
      }
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects padded base64url in every private JWK key member without exposing it", () =>
  Effect.gen(function*() {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "EdDSA" })
    for (
      const { algorithm, jwk, members } of [
        { algorithm: "RS256", jwk: rfc7515.rs256.jwk, members: ["n", "e", "d", "p", "q", "dp", "dq", "qi"] },
        { algorithm: "ES256", jwk: rfc7515.es256.jwk, members: ["x", "y", "d"] },
        { algorithm: "EdDSA", jwk: Redacted.value(pair.privateKey), members: ["x", "d"] }
      ] as const
    ) {
      for (const member of members) {
        const value = `${Reflect.get(jwk, member)}=`
        const invalid = { ...jwk, [member]: value }
        assert.isFalse(Schema.is(Jwk.PrivateJwk)(invalid))
        const error = yield* Jwk.importPrivate(Redacted.make(invalid), algorithm).pipe(Effect.flip)
        assertReason(error, "InvalidKey")
        assert.include(error.reason.description, "base64url")
        assert.isUndefined(error.reason.cause)
        assert.notInclude(JSON.stringify(error), value)
      }
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects whitespace, invalid alphabets, invalid lengths, and nonzero trailing bits in JWK members", () =>
  Effect.gen(function*() {
    const { d: _d, ...publicJwk } = rfc7515.es256.jwk
    for (const value of [`${rfc7515.es256.jwk.x} `, "***", "/w", "A", "AB"]) {
      const publicError = yield* Jwk.importPublic({ ...publicJwk, x: value }, "ES256").pipe(Effect.flip)
      assertReason(publicError, "InvalidKey")
      assert.include(publicError.reason.description, "base64url")

      const privateError = yield* Jwk.importPrivate(
        Redacted.make({ ...rfc7515.es256.jwk, d: value }),
        "ES256"
      ).pipe(Effect.flip)
      assertReason(privateError, "InvalidKey")
      assert.include(privateError.reason.description, "base64url")
      assert.isUndefined(privateError.reason.cause)
    }
  }))

it.effect("binds imported keys to the selected algorithm and honours JWK metadata", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importPublic(es256PublicJwk, "ES256")
    assert.strictEqual(key.algorithm, "ES256")
    assert.isUndefined(key.kid)

    // Curve family and selected algorithm must agree.
    assertReason(yield* Jwk.importPublic(es256PublicJwk, "EdDSA").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importPublic(es256PublicJwk, "ES384").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importPublic(es256PublicJwk, "ES512").pipe(Effect.flip), "InvalidKey")
    // Declared `alg` wins over the selection when they disagree.
    assertReason(
      yield* Jwk.importPublic({ ...es256PublicJwk, alg: "RS256" }, "ES256").pipe(Effect.flip),
      "InvalidKey"
    )
    // `use`/`key_ops` that exclude signing are not verification keys.
    assertReason(
      yield* Jwk.importPublic({ ...es256PublicJwk, use: "enc" }, "ES256").pipe(Effect.flip),
      "InvalidKey"
    )
    // Private members never satisfy the public schema.
    assert.isFalse(Schema.is(Jwk.PublicJwk)(rfc7515.es256.jwk))
    assert.isTrue(Schema.is(Jwk.PrivateJwk)(rfc7515.es256.jwk))
    // Not even RSA factors without `d`.
    const { d: _d, ...factors } = rfc7515.rs256.jwk
    assert.isFalse(Schema.is(Jwk.PublicJwk)(factors))
    assert.isFalse(Schema.is(Jwks.KeySet)({ keys: [factors] }))
    assertReason(
      yield* Jwk.importPublic(factors as unknown as Jwk.PublicJwk, "RS256").pipe(Effect.flip),
      "InvalidKey"
    )
  }))

it.effect("rejects RSA keys below 2048 bits", () =>
  Effect.gen(function*() {
    const { privateKey, publicKey } = NodeCrypto.generateKeyPairSync("rsa", { modulusLength: 1024 })
    const jwk = publicKey.export({ format: "jwk" }) as unknown as Jwk.PublicJwk
    assertReason(yield* Jwk.importPublic(jwk, "RS256").pipe(Effect.flip), "InvalidKey")
    assertReason(
      yield* Jwk.importSpki(publicKey.export({ format: "pem", type: "spki" }).toString(), "RS384").pipe(Effect.flip),
      "InvalidKey"
    )
    assertReason(
      yield* Jwk.importPkcs8(
        Redacted.make(new Uint8Array(privateKey.export({ format: "der", type: "pkcs8" }))),
        "PS512"
      ).pipe(Effect.flip),
      "InvalidKey"
    )
  }))

it.effect("interoperates with jose for SPKI and PKCS#8 in DER and PEM form", () =>
  Effect.gen(function*() {
    for (const algorithm of ["RS256", "PS256", "ES256", "ES384", "ES512", "EdDSA"] as const) {
      const pair = yield* Effect.promise(() => jose.generateKeyPair(algorithm, { extractable: true }))
      const publicPem = yield* Effect.promise(() => jose.exportSPKI(pair.publicKey))
      const privatePem = yield* Effect.promise(() => jose.exportPKCS8(pair.privateKey))
      const publicDer = new Uint8Array(NodeCrypto.createPublicKey(publicPem).export({ format: "der", type: "spki" }))
      const privateDer = new Uint8Array(
        NodeCrypto.createPrivateKey(privatePem).export({ format: "der", type: "pkcs8" })
      )

      for (const format of ["der", "pem"] as const) {
        const publicData = format === "pem" ? publicPem : publicDer
        const privateData = format === "pem" ? privatePem : privateDer
        const publicKey = yield* Jwk.importSpki(publicData, algorithm, { kid: "key-1" })
        const privateKey = yield* Jwk.importPkcs8(Redacted.make(privateData), algorithm, { kid: "key-1" })
        assert.strictEqual(publicKey.algorithm, algorithm)
        assert.strictEqual(privateKey.algorithm, algorithm)
        assert.strictEqual(privateKey.kid, "key-1")
        assert.deepInclude(publicKey.jwk, { alg: algorithm, kid: "key-1", use: "sig" })

        const exportedPublic = yield* Jwk.exportSpki(publicKey, { format })
        const exportedPrivate = yield* Jwk.exportPkcs8(privateKey, { format })
        assert.isTrue(Redacted.isRedacted(exportedPrivate))
        assert.deepStrictEqual(
          typeof exportedPublic === "string" ? exportedPublic.trim() : exportedPublic,
          typeof publicData === "string" ? publicData.trim() : publicData
        )
        const exportedPrivateData = Redacted.value(exportedPrivate)
        assert.deepStrictEqual(
          typeof exportedPrivateData === "string" ? exportedPrivateData.trim() : exportedPrivateData,
          typeof privateData === "string" ? privateData.trim() : privateData
        )

        const token = yield* Jws.sign(utf8("key formats"), privateKey)
        const theirs = yield* Effect.promise(() => jose.compactVerify(Redacted.value(token), pair.publicKey))
        assert.deepStrictEqual(new Uint8Array(theirs.payload), utf8("key formats"))
        assert.deepStrictEqual((yield* Jws.verify(token, publicKey)).payload, utf8("key formats"))
      }
    }
  }).pipe(Effect.provide(layer)))

it.effect("rejects mismatched PEM roles and algorithms without exposing private input", () =>
  Effect.gen(function*() {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "ES384" })
    const publicKey = yield* Jwk.importPublic(pair.publicKey, "ES384")
    const privateKey = yield* Jwk.importPrivate(pair.privateKey, "ES384")
    const publicPem = yield* Jwk.exportSpki(publicKey, { format: "pem" })
    const privatePem = yield* Jwk.exportPkcs8(privateKey, { format: "pem" })
    assertReason(yield* Jwk.importSpki(publicPem, "ES256").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importPkcs8(privatePem, "ES512").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importSpki(Redacted.value(privatePem), "ES384").pipe(Effect.flip), "InvalidKey")
    assertReason(yield* Jwk.importPkcs8(Redacted.make(publicPem), "ES384").pipe(Effect.flip), "InvalidKey")

    const marker = "private-pem-marker"
    const error = yield* Jwk.importPkcs8(Redacted.make(marker), "ES384").pipe(Effect.flip)
    assertReason(error, "InvalidKey")
    assert.isUndefined(error.reason.cause)
    assert.notInclude(JSON.stringify(error), marker)
  }).pipe(Effect.provide(layer)))

it.effect("imports octet keys with per-algorithm length rules", () =>
  Effect.gen(function*() {
    const hmac = yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "HS256")
    assert.strictEqual(hmac.algorithm, "HS256")
    const dir = yield* Jwk.importSecret(Redacted.make({ ...secretJwk, kid: "enc-1" }), "dir")
    assert.strictEqual(dir.algorithm, "dir")
    assert.strictEqual(dir.kid, "enc-1")

    for (const [algorithm, length] of [["HS256", 32], ["HS384", 48], ["HS512", 64]] as const) {
      const jwk = (size: number) =>
        Redacted.make({ kty: "oct", k: jose.base64url.encode(new Uint8Array(size)) } as const)
      assertReason(yield* Jwk.importSecret(jwk(length - 1), algorithm).pipe(Effect.flip), "InvalidKey")
      assert.strictEqual((yield* Jwk.importSecret(jwk(length), algorithm)).algorithm, algorithm)
      assert.strictEqual((yield* Jwk.importSecret(jwk(length + 1), algorithm)).algorithm, algorithm)
    }
    assertReason(yield* Jwk.importSecret(Redacted.make(rfc7515.hs256.jwk), "dir").pipe(Effect.flip), "InvalidKey")
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, alg: "HS256" }), "dir").pipe(Effect.flip),
      "InvalidKey"
    )
    // A symmetric key performs both operations, so `key_ops` must allow both.
    yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["sign", "verify"] }), "HS256")
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["verify"] }), "HS256").pipe(Effect.flip),
      "InvalidKey"
    )
    assertReason(
      yield* Jwk.importSecret(Redacted.make({ ...secretJwk, key_ops: ["decrypt"] }), "dir").pipe(Effect.flip),
      "InvalidKey"
    )
  }))

it.effect("generates redacted secrets with the required length and metadata", () =>
  Effect.gen(function*() {
    for (
      const [algorithm, length, use] of [
        ["HS256", 32, "sig"],
        ["HS384", 48, "sig"],
        ["HS512", 64, "sig"],
        ["dir", 32, "enc"]
      ] as const
    ) {
      const secret = yield* Jwk.generateSecret(algorithm, { kid: "secret-1" })
      assert.isTrue(Redacted.isRedacted(secret))
      const jwk = Redacted.value(secret)
      assert.deepInclude(jwk, { kty: "oct", alg: algorithm, use, kid: "secret-1" })
      assert.strictEqual(jose.base64url.decode(jwk.k).length, length)
      assert.notInclude(JSON.stringify(secret), jwk.k)
      assert.strictEqual((yield* Jwk.importSecret(secret, algorithm)).algorithm, algorithm)
      if (algorithm === "dir") {
        const key = yield* Jwk.importSecret(secret, "dir")
        const token = yield* Jwe.encrypt(utf8("generated secret"), key)
        const theirs = yield* Effect.promise(() =>
          jose.compactDecrypt(Redacted.value(token), jose.base64url.decode(jwk.k))
        )
        assert.deepStrictEqual(new Uint8Array(theirs.plaintext), utf8("generated secret"))
      }
    }
    assert.isUndefined(Redacted.value(yield* Jwk.generateSecret("HS256")).kid)
  }).pipe(Effect.provide(layer)))

it.effect("matches jose thumbprints across hashes, metadata, and public or private key inputs", () =>
  Effect.gen(function*() {
    const ed25519 = yield* Jwk.generateKeyPair({ algorithm: "EdDSA" })
    for (
      const [algorithm, publicJwk, privateJwk] of [
        ["RS256", rs256PublicJwk, Redacted.make(rfc7515.rs256.jwk)],
        ["ES256", es256PublicJwk, Redacted.make(rfc7515.es256.jwk)],
        ["EdDSA", ed25519.publicKey, ed25519.privateKey]
      ] as const
    ) {
      const publicKey = yield* Jwk.importPublic(publicJwk, algorithm)
      const privateKey = yield* Jwk.importPrivate(privateJwk, algorithm)
      const metadata = {
        ...publicJwk,
        _tag: "PublicKey",
        key: "ignored",
        kid: "ignored",
        alg: "ignored",
        use: "enc",
        key_ops: ["encrypt"]
      }
      for (
        const [hash, name] of [
          [Digest.sha256, "sha256"],
          [Digest.sha384, "sha384"],
          [Digest.sha512, "sha512"]
        ] as const
      ) {
        const expected = yield* Effect.promise(() =>
          jose.calculateJwkThumbprint(publicJwk as unknown as jose.JWK, name)
        )
        for (const input of [publicJwk, metadata, privateJwk, publicKey, privateKey]) {
          assert.strictEqual(yield* Jwk.thumbprint(input, hash), expected)
        }
        const uri = yield* Effect.promise(() => jose.calculateJwkThumbprintUri(publicJwk as unknown as jose.JWK, name))
        assert.strictEqual(yield* Jwk.thumbprintUri(publicKey, hash), uri)
      }
    }

    const expected = yield* Effect.promise(() => jose.calculateJwkThumbprint(secretJwk as jose.JWK))
    assert.strictEqual(yield* Jwk.thumbprint(Redacted.make(secretJwk)), expected)
    for (const algorithm of ["HS256", "dir"] as const) {
      const key = yield* Jwk.importSecret(Redacted.make(secretJwk), algorithm)
      assert.strictEqual(yield* Jwk.thumbprint(key), expected)
    }
    assert.strictEqual(
      yield* Jwk.thumbprintUri(Redacted.make(secretJwk)),
      `urn:ietf:params:oauth:jwk-thumbprint:sha-256:${expected}`
    )
  }).pipe(Effect.provide(layer)))

it.effect("rejects invalid thumbprint members and unsupported hashes without exposing secrets", () =>
  Effect.gen(function*() {
    const marker = "secret-thumbprint-marker!"
    for (
      const input of [
        { ...rs256PublicJwk, e: "" },
        { ...es256PublicJwk, x: "AB" },
        Redacted.make({ ...secretJwk, k: marker }),
        { kty: "unsupported" } as unknown as Jwk.PublicJwk
      ]
    ) {
      const error = yield* Jwk.thumbprint(input).pipe(Effect.flip)
      assertReason(error, "InvalidKey")
      assert.isUndefined(error.reason.cause)
      assert.notInclude(JSON.stringify(error), marker)
    }
    for (const hash of [Digest.md5, Digest.sha1]) {
      assertReason(yield* Jwk.thumbprint(rs256PublicJwk, hash).pipe(Effect.flip), "InvalidArgument")
    }
  }).pipe(Effect.provide(layer)))
