import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as TestClock from "effect/testing/TestClock"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("NodeCrypto", () => {
  it.effect("provides every service except Argon2id from the aggregate layer", () =>
    Effect.gen(function*() {
      yield* TestClock.setTime(0x0123456789ab)
      const uuid = yield* Crypto.randomUUIDv7()
      assert.match(uuid, uuidV7Regex)
      assert.strictEqual(uuid.slice(0, 13), "01234567-89ab")
      const sha2 = yield* Crypto.Sha2
      const digest = yield* sha2.digest("SHA-256", new TextEncoder().encode("hello"))
      assert.strictEqual(Hex.encode(digest), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
      yield* Crypto.Md5
      yield* Crypto.XChaCha20Poly1305
      yield* Crypto.ChaCha20Poly1305
      yield* Crypto.Ed25519
    }).pipe(Effect.provide(NodeCrypto.layer)))
})

describeCrypto("NodeCrypto services", {
  md5: NodeCrypto.layerMd5,
  chaCha20Poly1305: NodeCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: NodeCrypto.layerXChaCha20Poly1305,
  argon2id: NodeCrypto.layerArgon2id
})
