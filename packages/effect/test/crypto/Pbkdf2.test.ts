import { assert, describe, it } from "@effect/vitest"
import * as Pbkdf2 from "effect/crypto/Pbkdf2"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { assertReason, encode, unreachable } from "../utils/crypto.ts"

describe("Pbkdf2", () => {
  it.effect("derives the requested length and verifies passwords", () =>
    Effect.gen(function*() {
      const pbkdf2 = yield* Pbkdf2.Pbkdf2
      const password = Redacted.make(encode("password"))
      const options = { hash: "SHA-256", password, salt: encode("salt"), iterations: 2 } as const
      const expected = Redacted.value(yield* pbkdf2.derive({ ...options, length: 20 }))
      assert.strictEqual(expected.length, 20)
      assert.isTrue(yield* pbkdf2.verify({ ...options, expected }))
      assert.isFalse(yield* pbkdf2.verify({ ...options, password: Redacted.make(encode("wrong")), expected }))
      // A stored hash of no valid output length never matches.
      assert.isFalse(yield* pbkdf2.verify({ ...options, expected: new Uint8Array() }))
    }).pipe(Effect.provide(Pbkdf2.layer)))

  // Some backends wrap lengths of 2^32 bits or more, and Node.js aborts the
  // process on iteration counts of 2^31 or more.
  it.effect("checks lengths and iterations before calling Web Crypto", () =>
    Effect.gen(function*() {
      const pbkdf2 = yield* Pbkdf2.Pbkdf2
      const data = new Uint8Array(16)
      const password = Redacted.make(data)
      for (const [iterations, length] of [[0, 32], [2 ** 31, 32], [1, 2 ** 29]]) {
        assertReason(
          yield* Effect.flip(pbkdf2.derive({ hash: "SHA-256", password, salt: data, iterations, length })),
          "InvalidArgument"
        )
      }
      assertReason(
        yield* Effect.flip(
          pbkdf2.verify({ hash: "SHA-256", password, salt: data, iterations: 0, expected: data })
        ),
        "InvalidArgument",
        "verify"
      )
    }).pipe(Effect.provide(Pbkdf2.layer.pipe(Layer.provide(unreachable)))))
})
