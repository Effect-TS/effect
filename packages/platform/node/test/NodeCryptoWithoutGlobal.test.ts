import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it, vi } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"

// Kept in its own file: the `Crypto.SubtleCrypto` reference caches its
// default, so removing the global would affect later tests in the same file.
describe("NodeCrypto without globalThis.crypto", () => {
  it.effect("runs on node:crypto without globalThis.crypto, as on Node.js 18", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => vi.stubGlobal("crypto", undefined)),
      () =>
        Effect.gen(function*() {
          assert.strictEqual(globalThis.crypto, undefined)
          assert.strictEqual((yield* Crypto.randomBytes(70_000)).length, 70_000)
          const aes = yield* Crypto.Aes
          const key = yield* aes.generateKey()
          const nonce = yield* Crypto.randomBytes(12)
          const sealed = yield* aes.encryptGcm({ key, nonce, data: new TextEncoder().encode("hello") })
          assert.strictEqual(new TextDecoder().decode(yield* aes.decryptGcm({ key, nonce, data: sealed })), "hello")
          // Key encoding reads the Web Crypto reference directly, not through a service layer.
          const { publicKey } = yield* (yield* Crypto.Ed25519).generateKeyPair()
          const jwk = yield* Crypto.ed25519PublicKeyToJwk(publicKey)
          assert.deepStrictEqual(yield* Crypto.ed25519PublicKeyFromJwk(jwk), publicKey)
        }).pipe(Effect.provide(NodeCrypto.layer)),
      () => Effect.sync(() => vi.unstubAllGlobals())
    ))
})
