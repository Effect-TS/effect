import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

describe("BunCrypto", () => {
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
    }).pipe(Effect.provide(BunCrypto.layer)))
})
