import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it, vi } from "@effect/vitest"
import * as Aes from "effect/crypto/Aes"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"

// Kept in its own file: the `WebCrypto.SubtleCrypto` reference caches its
// default, so removing the global would affect later tests in the same file.
describe("NodeCrypto without globalThis.crypto", () => {
  it.effect("runs on node:crypto without globalThis.crypto, as on Node.js 18", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => vi.stubGlobal("crypto", undefined)),
      () =>
        Effect.gen(function*() {
          assert.strictEqual(globalThis.crypto, undefined)
          assert.strictEqual((yield* SecureRandom.randomBytes(70_000)).length, 70_000)
          const aes = yield* Aes.Aes
          const key = yield* aes.generateKey()
          const nonce = yield* SecureRandom.randomBytes(12)
          const sealed = yield* aes.encryptGcm({ key, nonce, data: new TextEncoder().encode("hello") })
          assert.strictEqual(new TextDecoder().decode(yield* aes.decryptGcm({ key, nonce, data: sealed })), "hello")
          // Key encoding reads the Web Crypto reference directly, not through a service layer.
          const { publicKey } = yield* (yield* Ed25519.Ed25519).generateKeyPair()
          const jwk = yield* Ed25519.publicKeyToJwk(publicKey)
          assert.deepStrictEqual(yield* Ed25519.publicKeyFromJwk(jwk), publicKey)
        }).pipe(Effect.provide(NodeCrypto.layer)),
      () => Effect.sync(() => vi.unstubAllGlobals())
    ))
})
