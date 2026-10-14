import { Jwe, Jwk, Jws } from "@effect/jose"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import * as jose from "jose"
import { createCipheriv, createHmac, createPrivateKey, sign } from "node:crypto"
import { cryptoLayer, independentJws, privateJwk, publicJwk, secret, secretJwk, utf8 } from "./fixtures.ts"

// Compact validation adapted from panva/jose test/jws/{compact.verify,
// flattened.verify,crit,restrictions}.test.ts and test/jwe/{compact.decrypt,
// flattened.decrypt}.test.ts. Unsupported headers are independently authenticated
// so a bad signature/tag cannot mask an accidentally accepted header.
const signedHeader = (header: Uint8Array) => {
  const input = `${jose.base64url.encode(header)}.${jose.base64url.encode(utf8("payload"))}`

  return Redacted.make(
    `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`
  )
}

const encryptedHeader = (header: Uint8Array) => {
  const protectedPart = jose.base64url.encode(header)
  const iv = new Uint8Array(12)
  const cipher = createCipheriv("aes-256-gcm", secret, iv)

  cipher.setAAD(utf8(protectedPart))
  const encrypted = Buffer.concat([cipher.update(utf8("payload")), cipher.final()])

  return Redacted.make(
    `${protectedPart}..${jose.base64url.encode(iv)}.${encrypted.toString("base64url")}.${
      cipher.getAuthTag().toString("base64url")
    }`
  )
}

it.effect.each([
  { name: "empty", bytes: utf8("") },
  { name: "malformed JSON", bytes: utf8("{") },
  { name: "null", bytes: utf8("null") },
  { name: "array", bytes: utf8("[]") },
  { name: "string", bytes: utf8("\"header\"") },
  { name: "number", bytes: utf8("1") },
  { name: "invalid UTF-8", bytes: new Uint8Array([0xff]) }
])("rejects authenticated $name protected headers", ({ bytes }) =>
  Effect.gen(function*() {
    const signing = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const encryption = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")

    assert.deepInclude(yield* Jws.verify(signedHeader(bytes), signing, { algorithms: ["HS256"] }).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "header"
    })
    assert.deepInclude(yield* Jwe.decrypt(encryptedHeader(bytes), encryption).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "header"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { name: "absent algorithm", header: {} },
  { name: "non-string algorithm", header: { alg: 1 } },
  { name: "unsecured algorithm", header: { alg: "none" } },
  { name: "unsupported algorithm", header: { alg: "HS384" } },
  { name: "non-string key identifier", header: { alg: "HS256", kid: 1 } },
  { name: "non-string type", header: { alg: "HS256", typ: 1 } },
  { name: "empty content type", header: { alg: "HS256", cty: "" } },
  { name: "empty critical list", header: { alg: "HS256", crit: [] } },
  {
    name: "unknown critical extension",
    header: { alg: "HS256", crit: ["extension"], extension: true }
  },
  { name: "unencoded payload flag without crit", header: { alg: "HS256", b64: false } },
  { name: "explicit encoded payload extension", header: { alg: "HS256", b64: true } }
])("rejects authenticated JWS with $name", ({ header }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    assert.deepInclude(
      yield* Jws.verify(signedHeader(utf8(JSON.stringify(header))), key, {
        algorithms: ["HS256"]
      }).pipe(Effect.flip),
      { _tag: "JoseInvalidToken", reason: "header" }
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each([
  { name: "absent algorithm", header: { enc: "A256GCM" } },
  { name: "absent encryption method", header: { alg: "dir" } },
  { name: "unsupported encryption method", header: { alg: "dir", enc: "A128GCM" } },
  { name: "unsupported key management", header: { alg: "A256KW", enc: "A256GCM" } },
  { name: "non-string key identifier", header: { alg: "dir", enc: "A256GCM", kid: 1 } },
  {
    name: "critical extension",
    header: { alg: "dir", enc: "A256GCM", crit: ["extension"], extension: true }
  },
  { name: "compression", header: { alg: "dir", enc: "A256GCM", zip: "DEF" } }
])("rejects authenticated JWE with $name", ({ header }) =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")

    assert.deepInclude(yield* Jwe.decrypt(encryptedHeader(utf8(JSON.stringify(header))), key).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "header"
    })
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects noncanonical compact JWS members and incorrect HMAC lengths", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const token = yield* independentJws(utf8("payload"))
    const parts = Redacted.value(token).split(".")

    for (const value of [parts.slice(0, 2).join("."), [...parts, ""].join(".")]) {
      assert.deepInclude(yield* Jws.verify(Redacted.make(value), key, { algorithms: ["HS256"] }).pipe(Effect.flip), {
        _tag: "JoseInvalidToken",
        reason: "serialization"
      })
    }
    for (
      const [index, value] of [
        [0, "!"],
        [1, "!"],
        [2, "!"],
        [1, "AB"],
        [2, `${parts[2]}=`]
      ] as const
    ) {
      const changed = [...parts]

      changed[index] = value
      assert.deepInclude(
        yield* Jws.verify(Redacted.make(changed.join(".")), key, { algorithms: ["HS256"] }).pipe(
          Effect.flip
        ),
        { _tag: "JoseInvalidToken", reason: "serialization" }
      )
    }
    for (const length of [0, 31, 33]) {
      const changed = `${parts[0]}.${parts[1]}.${jose.base64url.encode(new Uint8Array(length))}`

      assert.strictEqual(
        (yield* Jws.verify(Redacted.make(changed), key, { algorithms: ["HS256"] }).pipe(
          Effect.flip
        ))._tag,
        "JoseSignatureVerificationFailed"
      )
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects DER-encoded ES256 signatures over the correct signing input", () =>
  Effect.gen(function*() {
    const key = yield* Jwk.importPublic(publicJwk, "ES256")
    const input = `${jose.base64url.encode("{\"alg\":\"ES256\"}")}.${jose.base64url.encode("payload")}`
    const signing = createPrivateKey({ key: privateJwk, format: "jwk" })
    const p1363 = sign("sha256", utf8(input), { key: signing, dsaEncoding: "ieee-p1363" })
    const der = sign("sha256", utf8(input), { key: signing, dsaEncoding: "der" })

    assert.deepStrictEqual(
      Redacted.value(
        (yield* Jws.verify(Redacted.make(`${input}.${p1363.toString("base64url")}`), key, {
          algorithms: ["ES256"]
        })).payload
      ),
      utf8("payload")
    )
    assert.strictEqual(
      (yield* Jws.verify(Redacted.make(`${input}.${der.toString("base64url")}`), key, {
        algorithms: ["ES256"]
      }).pipe(Effect.flip))._tag,
      "JoseSignatureVerificationFailed"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "validates every JWE member and the ciphertext/tag boundary before releasing plaintext",
  () =>
    Effect.gen(function*() {
      const key = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")

      const token = yield* Effect.promise(() =>
        new jose.CompactEncrypt(utf8("payload"))
          .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
          .encrypt(secret)
      )

      const parts = token.split(".")

      for (const value of [parts.slice(0, 4).join("."), [...parts, ""].join(".")]) {
        assert.deepInclude(yield* Jwe.decrypt(Redacted.make(value), key).pipe(Effect.flip), {
          _tag: "JoseInvalidToken",
          reason: "serialization"
        })
      }
      for (
        const [index, value] of [
          [0, "!"],
          [1, "AA"],
          [2, "!"],
          [3, "!"],
          [4, "!"],
          [2, ""],
          [4, ""],
          [2, jose.base64url.encode(new Uint8Array(11))],
          [2, jose.base64url.encode(new Uint8Array(13))]
        ] as const
      ) {
        const changed = [...parts]

        changed[index] = value
        assert.deepInclude(yield* Jwe.decrypt(Redacted.make(changed.join(".")), key).pipe(Effect.flip), {
          _tag: "JoseInvalidToken",
          reason: "serialization"
        })
      }
      const ciphertext = jose.base64url.decode(parts[3])
      const tag = jose.base64url.decode(parts[4])
      const sealed = new Uint8Array([...ciphertext, ...tag])

      // Keep the authenticated bytes identical; only their compact framing changes.
      for (const tagLength of [15, 17]) {
        const changed = [
          ...parts.slice(0, 3),
          jose.base64url.encode(sealed.subarray(0, -tagLength)),
          jose.base64url.encode(sealed.subarray(-tagLength))
        ]

        assert.deepInclude(yield* Jwe.decrypt(Redacted.make(changed.join(".")), key).pipe(Effect.flip), {
          _tag: "JoseInvalidToken",
          reason: "serialization"
        })
      }
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect.each([
  { name: "empty", bytes: new Uint8Array() },
  { name: "binary", bytes: new Uint8Array([0, 255, 128, 1, 0]) }
])("interoperates with $name compact payloads", ({ bytes }) =>
  Effect.gen(function*() {
    const signing = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const signed = yield* independentJws(bytes)

    assert.deepStrictEqual(
      Redacted.value((yield* Jws.verify(signed, signing, { algorithms: ["HS256"] })).payload),
      bytes
    )
    const encryption = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")

    const encrypted = yield* Effect.promise(() =>
      new jose.CompactEncrypt(bytes)
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .encrypt(secret)
    )

    assert.deepStrictEqual(Redacted.value((yield* Jwe.decrypt(Redacted.make(encrypted), encryption)).plaintext), bytes)

    const ours = yield* Jwe.encrypt(Redacted.make(bytes), encryption, {
      alg: "dir",
      enc: "A256GCM"
    })

    assert.deepStrictEqual(
      (yield* Effect.promise(() => jose.compactDecrypt(Redacted.value(ours), secret))).plaintext,
      bytes
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("enforces advertised payload, protected-header and compact-token limits", () =>
  Effect.gen(function*() {
    const signing = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
    const encryption = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
    const boundary = Redacted.make(new Uint8Array(45000))
    const signed = yield* Jws.sign(boundary, signing, { alg: "HS256" })
    const encrypted = yield* Jwe.encrypt(boundary, encryption, { alg: "dir", enc: "A256GCM" })

    assert.lengthOf((yield* Effect.promise(() => jose.compactVerify(Redacted.value(signed), secret))).payload, 45000)
    assert.lengthOf(
      (yield* Effect.promise(() => jose.compactDecrypt(Redacted.value(encrypted), secret)))
        .plaintext,
      45000
    )
    const oversized = Redacted.make(new Uint8Array(45001))

    assert.deepInclude(yield* Jws.sign(oversized, signing, { alg: "HS256" }).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "payload"
    })
    assert.deepInclude(yield* Jwe.encrypt(oversized, encryption, { alg: "dir", enc: "A256GCM" }).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "payload"
    })
    const header = { alg: "HS256", extension: "x".repeat(4096) }

    assert.deepInclude(
      yield* Jws.verify(signedHeader(utf8(JSON.stringify(header))), signing, {
        algorithms: ["HS256"]
      }).pipe(Effect.flip),
      { _tag: "JoseInvalidToken", reason: "header" }
    )
    assert.deepInclude(
      yield* Jwe.decrypt(
        encryptedHeader(utf8(JSON.stringify({ ...header, alg: "dir", enc: "A256GCM" }))),
        encryption
      ).pipe(Effect.flip),
      { _tag: "JoseInvalidToken", reason: "serialization" }
    )
    const tooLong = Redacted.make("x".repeat(65537))

    assert.deepInclude(yield* Jws.verify(tooLong, signing, { algorithms: ["HS256"] }).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "serialization"
    })
    assert.deepInclude(yield* Jwe.decrypt(tooLong, encryption).pipe(Effect.flip), {
      _tag: "JoseInvalidToken",
      reason: "serialization"
    })
  }).pipe(Effect.provide(cryptoLayer)))
