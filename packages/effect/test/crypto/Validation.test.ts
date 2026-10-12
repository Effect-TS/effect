import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

// A `SubtleCrypto` that throws on any access, so the tests prove that invalid
// arguments are rejected before reaching Web Crypto.
const unreachable = Layer.succeed(
  Crypto.SubtleCrypto,
  new Proxy({} as SubtleCrypto, {
    get: () => {
      throw new Error("invalid arguments reached Web Crypto")
    }
  })
)

const assertReason = (
  error: Crypto.CryptoError,
  method: string,
  reason: Crypto.CryptoErrorReason["_tag"]
) => {
  assert.strictEqual(error.method, method)
  assert.strictEqual(error.reason._tag, reason)
}

describe("argument validation", () => {
  // Some backends wrap lengths of 2^32 bits or more, and Node.js aborts the
  // process on iteration counts of 2^31 or more.
  it.effect("checks derivation lengths and iterations", () =>
    Effect.gen(function*() {
      const hkdf = yield* Crypto.Hkdf
      const pbkdf2 = yield* Crypto.Pbkdf2
      const key = Redacted.make(new Uint8Array(16))
      const bytes = new Uint8Array(16)
      for (const length of [0, 255 * 32 + 1]) {
        assertReason(yield* Effect.flip(hkdf.derive({ hash: "SHA-256", key, length })), "derive", "BadArgument")
      }
      for (const [iterations, length] of [[0, 32], [2 ** 31, 32], [1, 2 ** 29]]) {
        assertReason(
          yield* Effect.flip(pbkdf2.derive({ hash: "SHA-256", password: bytes, salt: bytes, iterations, length })),
          "derive",
          "BadArgument"
        )
      }
      assertReason(
        yield* Effect.flip(
          pbkdf2.verify({ hash: "SHA-256", password: bytes, salt: bytes, iterations: 0, expected: bytes })
        ),
        "verify",
        "BadArgument"
      )
    }).pipe(Effect.provide(Layer.mergeAll(Crypto.layerHkdf, Crypto.layerPbkdf2).pipe(Layer.provideMerge(unreachable)))))

  it.effect("checks raw key lengths", () =>
    Effect.gen(function*() {
      assertReason(
        yield* Effect.flip(Crypto.ed25519PrivateKeyFromRaw(new Uint8Array(31))),
        "ed25519PrivateKeyFromRaw",
        "InvalidKey"
      )
    }).pipe(Effect.provide(unreachable)))
})
