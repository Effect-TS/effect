import { Jwe, Jwk, Jwks, Jws } from "@effect/jose"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import * as jose from "jose"
import { generateKeyPairSync } from "node:crypto"
import { cryptoLayer, independentJws, privateJwk, publicJwk, secret, secretJwk, utf8 } from "./fixtures.ts"

// Adapted from panva/jose test/jwk/{jwk2key,key_input}.test.ts and
// test/jws/restrictions.test.ts; see THIRD_PARTY_NOTICES.md. Assertions observe
// imported-key authority and independent signatures, rather than native caches.
it.effect(
  "captures key bytes once and keeps operation authority independent of input and exports",
  () =>
    Effect.gen(function*() {
      let reads = 0

      const input = {
        kty: "oct",
        key_ops: ["sign"],
        get k() {
          return reads++ === 0 ? secretJwk.k : jose.base64url.encode(new Uint8Array(32))
        }
      }

      const key = yield* Jwk.importSecret(Redacted.make(input), "HS256")

      input.key_ops.push("verify")
      const exported = Redacted.value(yield* Jwk.exportPrivate(key))

      Reflect.set(exported, "key_ops", ["verify"])
      const token = yield* Jws.sign(Redacted.make(utf8("snapshot")), key, { alg: "HS256" })

      const verified = yield* Effect.promise(() => jose.compactVerify(Redacted.value(token), secret))

      assert.deepStrictEqual(verified.payload, utf8("snapshot"))
      assert.strictEqual(reads, 1)
      assert.strictEqual(
        (yield* Jws.verify(token, key, { algorithms: ["HS256"] }).pipe(Effect.flip))._tag,
        "JoseInvalidKey"
      )
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect(
  "imports only own JWK members and does not inherit key identity or operation authority",
  () =>
    Effect.gen(function*() {
      const input = { ...publicJwk }

      Object.setPrototypeOf(input, { kid: "inherited", key_ops: ["verify"] })
      const key = yield* Jwk.importPublic(input, "ES256")

      assert.deepStrictEqual(yield* Jwk.exportPublic(key), publicJwk)
      const inheritedMaterial = {}

      Object.setPrototypeOf(inheritedMaterial, publicJwk)
      assert.strictEqual((yield* Jwk.importPublic(inheritedMaterial, "ES256").pipe(Effect.flip))._tag, "JoseInvalidKey")
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("keeps throwing input getters in the typed, secret-safe key error channel", () =>
  Effect.gen(function*() {
    const error = yield* Jwk.importSecret(
      Redacted.make({
        kty: "oct",
        get k() {
          throw new Error("private-key-getter-canary")
        }
      }),
      "HS256"
    ).pipe(Effect.flip)

    assert.strictEqual(error._tag, "JoseInvalidKey")
    assert.notInclude(JSON.stringify(error), "private-key-getter-canary")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("does not grant key operations supplied by an inherited array slot", () =>
  Effect.gen(function*() {
    const key_ops: Array<string> = []

    key_ops.length = 1
    Object.setPrototypeOf(key_ops, ["verify"])
    assert.strictEqual(
      (yield* Jwk.importPublic({ ...publicJwk, key_ops }, "ES256").pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("captures every operation slot before a getter can shorten its array", () =>
  Effect.gen(function*() {
    const key_ops: Array<unknown> = ["verify", 0]

    Object.defineProperty(key_ops, "0", {
      get() {
        key_ops.length = 1

        return "verify"
      }
    })
    assert.strictEqual(
      (yield* Jwk.importPublic({ ...publicJwk, key_ops }, "ES256").pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

// ec3ab38 expands sparse input lengths before admission. The throwing first
// slot safely stops the old loop; bounded admission must never invoke it.
it.effect.each(["JWK", "JWKS"] as const)(
  "rejects oversized sparse %s metadata before reading its slots",
  (boundary) =>
    Effect.gen(function*() {
      const sparse: Array<unknown> = []
      let reads = 0

      sparse.length = 100_000_000
      Object.defineProperty(sparse, "0", {
        get() {
          reads++
          throw new Error("oversized-array-slot-canary")
        }
      })

      const error = boundary === "JWK"
        ? yield* Jwk.importPublic({ ...publicJwk, key_ops: sparse }, "ES256").pipe(Effect.flip)
        : yield* Layer.build(Jwks.layerLocal({ keys: sparse })).pipe(Effect.flip)

      assert.strictEqual(error._tag, "JoseInvalidKey")
      assert.strictEqual(reads, 0)
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect.each([
  { name: "null", input: null },
  { name: "array", input: [] },
  { name: "absent key family", input: { crv: "P-256", x: publicJwk.x, y: publicJwk.y } },
  { name: "private public-key", input: privateJwk },
  { name: "wrong curve", input: { ...publicJwk, crv: "P-384" } },
  { name: "wrong coordinate length", input: { ...publicJwk, x: "AA" } },
  {
    name: "point outside the curve",
    input: {
      ...publicJwk,
      x: jose.base64url.encode(new Uint8Array(32)),
      y: jose.base64url.encode(new Uint8Array(32))
    }
  },
  { name: "padded coordinate", input: { ...publicJwk, x: `${publicJwk.x}=` } },
  { name: "mismatched algorithm metadata", input: { ...publicJwk, alg: "RS256" } },
  { name: "non-string kid", input: { ...publicJwk, kid: 0 } },
  { name: "malformed key use", input: { ...publicJwk, use: 0 } },
  { name: "duplicate key operations", input: { ...publicJwk, key_ops: ["verify", "verify"] } },
  { name: "non-array key operations", input: { ...publicJwk, key_ops: "verify" } }
])("rejects a $name at public-key import", ({ input }) =>
  Effect.gen(function*() {
    assert.strictEqual((yield* Jwk.importPublic(input, "ES256").pipe(Effect.flip))._tag, "JoseInvalidKey")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects incomplete private material and wrong algorithm families", () =>
  Effect.gen(function*() {
    for (const input of [publicJwk, { ...privateJwk, d: "AA" }]) {
      assert.strictEqual(
        (yield* Jwk.importPrivate(Redacted.make(input), "ES256").pipe(Effect.flip))._tag,
        "JoseInvalidKey"
      )
    }
    assert.strictEqual((yield* Jwk.importPublic(publicJwk, "RS256").pipe(Effect.flip))._tag, "JoseInvalidKey")
    assert.strictEqual(
      (yield* Jwk.importPrivate(Redacted.make(privateJwk), "EdDSA").pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
    assert.strictEqual(
      (yield* Jwk.importSecret(Redacted.make(privateJwk), "HS256").pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("rejects RSA below 2048 bits for both signature profiles and both key directions", () =>
  Effect.gen(function*() {
    const pair = yield* Effect.sync(() => generateKeyPairSync("rsa", { modulusLength: 2040 }))
    const publicKey = pair.publicKey.export({ format: "jwk" })
    const privateKey = pair.privateKey.export({ format: "jwk" })

    for (const algorithm of ["RS256", "PS256"] as const) {
      assert.strictEqual((yield* Jwk.importPublic(publicKey, algorithm).pipe(Effect.flip))._tag, "JoseInvalidKey")
      assert.strictEqual(
        (yield* Jwk.importPrivate(Redacted.make(privateKey), algorithm).pipe(Effect.flip))._tag,
        "JoseInvalidKey"
      )
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("enforces canonical symmetric material and the HS256 and dir key-size profiles", () =>
  Effect.gen(function*() {
    for (const k of ["", "!", `${secretJwk.k}=`, jose.base64url.encode(new Uint8Array(31))]) {
      assert.strictEqual(
        (yield* Jwk.importSecret(Redacted.make({ kty: "oct", k }), "HS256").pipe(Effect.flip))._tag,
        "JoseInvalidKey"
      )
    }
    const longer = { kty: "oct", k: jose.base64url.encode(new Uint8Array(33).fill(3)) }
    const hmac = yield* Jwk.importSecret(Redacted.make(longer), "HS256")
    const token = yield* Jws.sign(Redacted.make(utf8("payload")), hmac, { alg: "HS256" })

    assert.deepStrictEqual(
      (yield* Effect.promise(() => jose.compactVerify(Redacted.value(token), jose.base64url.decode(longer.k)))).payload,
      utf8("payload")
    )
    assert.strictEqual((yield* Jwk.importSecret(Redacted.make(longer), "dir").pipe(Effect.flip))._tag, "JoseInvalidKey")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("enforces symmetric key use and separate sign and verify operations", () =>
  Effect.gen(function*() {
    const payload = Redacted.make(utf8("payload"))
    const token = yield* independentJws(Redacted.value(payload))

    const encryptionOnly = yield* Jwk.importSecret(
      Redacted.make({ ...secretJwk, use: "enc" }),
      "HS256"
    )

    assert.strictEqual(
      (yield* Jws.sign(payload, encryptionOnly, { alg: "HS256" }).pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
    assert.strictEqual(
      (yield* Jws.verify(token, encryptionOnly, { algorithms: ["HS256"] }).pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )

    const verifyOnly = yield* Jwk.importSecret(
      Redacted.make({ ...secretJwk, use: "sig", key_ops: ["verify"] }),
      "HS256"
    )

    assert.deepStrictEqual(
      Redacted.value((yield* Jws.verify(token, verifyOnly, { algorithms: ["HS256"] })).payload),
      Redacted.value(payload)
    )
    assert.strictEqual(
      (yield* Jws.sign(payload, verifyOnly, { alg: "HS256" }).pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
    const asymmetric = yield* Jwk.importPublic(publicJwk, "ES256")

    assert.strictEqual(
      (yield* Jws.verify(token, asymmetric, { algorithms: ["HS256"] }).pipe(Effect.flip))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("enforces encryption key use, algorithm binding and per-operation authority", () =>
  Effect.gen(function*() {
    const encryptOnly = yield* Jwk.importSecret(
      Redacted.make({ ...secretJwk, use: "enc", key_ops: ["encrypt"] }),
      "dir"
    )

    const decryptOnly = yield* Jwk.importSecret(
      Redacted.make({ ...secretJwk, use: "enc", key_ops: ["decrypt"] }),
      "dir"
    )

    const payload = Redacted.make(utf8("payload"))
    const header = { alg: "dir", enc: "A256GCM" } as const
    const token = yield* Jwe.encrypt(payload, encryptOnly, header)

    assert.deepStrictEqual(Redacted.value((yield* Jwe.decrypt(token, decryptOnly)).plaintext), Redacted.value(payload))
    assert.strictEqual((yield* Jwe.decrypt(token, encryptOnly).pipe(Effect.flip))._tag, "JoseInvalidKey")
    assert.strictEqual((yield* Jwe.encrypt(payload, decryptOnly, header).pipe(Effect.flip))._tag, "JoseInvalidKey")
    const wrongUse = yield* Jwk.importSecret(Redacted.make({ ...secretJwk, use: "sig" }), "dir")
    const wrongAlgorithm = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")

    for (const key of [wrongUse, wrongAlgorithm]) {
      assert.strictEqual((yield* Jwe.encrypt(payload, key, header).pipe(Effect.flip))._tag, "JoseInvalidKey")
      assert.strictEqual((yield* Jwe.decrypt(token, key).pipe(Effect.flip))._tag, "JoseInvalidKey")
    }
  }).pipe(Effect.provide(cryptoLayer)))
