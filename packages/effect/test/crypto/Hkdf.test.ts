import { assert, describe, it } from "@effect/vitest"
import * as Hkdf from "effect/crypto/Hkdf"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, unreachable } from "../utils/crypto.ts"

describe("Hkdf", () => {
  it.effect("derives the requested length", () =>
    Effect.gen(function*() {
      const hkdf = yield* Hkdf.Hkdf
      const derived = yield* hkdf.derive({ hash: "SHA-256", key: Redacted.make(new Uint8Array(32)), length: 42 })
      assert.strictEqual(Redacted.value(derived).length, 42)
    }).pipe(Effect.provide(Hkdf.layer)))

  // Some backends wrap lengths of 2^32 bits or more.
  it.effect("checks the length before calling Web Crypto", () =>
    Effect.gen(function*() {
      const hkdf = yield* Hkdf.Hkdf
      const key = Redacted.make(new Uint8Array(16))
      for (const length of [0, 255 * 32 + 1]) {
        assertReason(yield* Effect.flip(hkdf.derive({ hash: "SHA-256", key, length })), "InvalidArgument")
      }
    }).pipe(Effect.provide(Hkdf.layer.pipe(Layer.provide(unreachable)))))
})
