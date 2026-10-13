import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Md5 from "effect/crypto/Md5"
import * as Sha2 from "effect/crypto/Sha2"
import * as Effect from "effect/Effect"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

describe("BunCrypto", () => {
  it.effect("provides every Bun service from the aggregate layer", () =>
    Effect.gen(function*() {
      const md5 = yield* Md5.Md5
      const digest = yield* md5.digest(new TextEncoder().encode("abc"))
      assert.strictEqual(digest.length, 16)
      yield* Sha2.Sha2
    }).pipe(Effect.provide(BunCrypto.layer)))
})

describeCrypto("BunCrypto services", { md5: BunCrypto.layerMd5 })
