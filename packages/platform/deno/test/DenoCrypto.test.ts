import * as DenoCrypto from "@effect/platform-deno/DenoCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

describe("DenoCrypto", () => {
  it.effect("computes PostgreSQL authentication primitives", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const encode = (s: string) => new TextEncoder().encode(s)
      assert.strictEqual(hex(yield* crypto.digest("MD5", encode("abc"))), "900150983cd24fb0d6963f7d28e17f72")
      assert.strictEqual(
        hex(yield* crypto.hmac("SHA-256", new Uint8Array(20).fill(0x0b), encode("Hi There"))),
        "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
      )
      assert.strictEqual(
        hex(yield* crypto.pbkdf2("SHA-256", encode("password"), encode("salt"), 2, 32)),
        "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
      )
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("computes SHA-256 digests", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode("hello"))
      assert.strictEqual(hex(digest), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates random bytes larger than the Web Crypto quota", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const bytes = yield* crypto.randomBytes(70_000)
      assert.strictEqual(bytes.length, 70_000)
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates UUIDv4 values", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      assert.match(yield* crypto.randomUUIDv4, uuidV4Regex)
    }).pipe(Effect.provide(DenoCrypto.layer)))

  it.effect("generates UUIDv7 values", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      assert.match(yield* crypto.randomUUIDv7, uuidV7Regex)
    }).pipe(Effect.provide(DenoCrypto.layer)))
})
