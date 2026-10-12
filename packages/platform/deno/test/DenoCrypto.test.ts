import * as DenoCrypto from "@effect/platform-deno/DenoCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("DenoCrypto", () => {
  it.effect("provides every Deno service from the aggregate layer", () =>
    Effect.gen(function*() {
      assert.match(yield* Crypto.randomUUIDv7(), uuidV7Regex)
      const sha2 = yield* Crypto.Sha2
      const digest = yield* sha2.digest("SHA-256", new TextEncoder().encode("abc"))
      assert.strictEqual(digest.length, 32)
      yield* Crypto.Md5
      yield* Crypto.XChaCha20Poly1305
    }).pipe(Effect.provide(DenoCrypto.layer)))
})

describeCrypto("DenoCrypto services", {
  md5: DenoCrypto.layerMd5,
  chaCha20Poly1305: DenoCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: DenoCrypto.layerXChaCha20Poly1305
})
