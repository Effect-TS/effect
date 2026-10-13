import * as DenoCrypto from "@effect/platform-deno/DenoCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import * as Md5 from "effect/crypto/Md5"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Sha2 from "effect/crypto/Sha2"
import * as Effect from "effect/Effect"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("DenoCrypto", () => {
  it.effect("provides every Deno service from the aggregate layer", () =>
    Effect.gen(function*() {
      assert.match(yield* SecureRandom.randomUUIDv7(), uuidV7Regex)
      const sha2 = yield* Sha2.Sha2
      const digest = yield* sha2.digest("SHA-256", new TextEncoder().encode("abc"))
      assert.strictEqual(digest.length, 32)
      yield* Md5.Md5
      yield* ChaCha20Poly1305.XChaCha20Poly1305
    }).pipe(Effect.provide(DenoCrypto.layer)))
})

describeCrypto("DenoCrypto services", {
  md5: DenoCrypto.layerMd5,
  chaCha20Poly1305: DenoCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: DenoCrypto.layerXChaCha20Poly1305
})
