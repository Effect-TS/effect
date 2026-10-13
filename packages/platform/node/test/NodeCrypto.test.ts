import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Md5 from "effect/crypto/Md5"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Sha2 from "effect/crypto/Sha2"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as TestClock from "effect/testing/TestClock"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("NodeCrypto", () => {
  it.effect("provides every service except Argon2id from the aggregate layer", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const uuid = yield* SecureRandom.randomUUIDv7()
      assert.match(uuid, uuidV7Regex)
      assert.strictEqual(uuid.slice(0, 13), "01234567-89ab")
      const sha2 = yield* Sha2.Sha2
      const digest = yield* sha2.digest("SHA-256", new TextEncoder().encode("hello"))
      assert.strictEqual(Hex.encode(digest), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
      yield* Md5.Md5
      yield* ChaCha20Poly1305.XChaCha20Poly1305
      yield* ChaCha20Poly1305.ChaCha20Poly1305
      yield* Ed25519.Ed25519
    }).pipe(Effect.provide(NodeCrypto.layer)))
})

describeCrypto("NodeCrypto services", {
  md5: NodeCrypto.layerMd5,
  chaCha20Poly1305: NodeCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: NodeCrypto.layerXChaCha20Poly1305,
  argon2id: NodeCrypto.layerArgon2id
})
