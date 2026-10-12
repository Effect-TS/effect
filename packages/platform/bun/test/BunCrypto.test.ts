import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

describe("BunCrypto", () => {
  it.effect("provides every Bun service from the aggregate layer", () =>
    Effect.gen(function*() {
      const md5 = yield* Crypto.Md5
      const digest = yield* md5.digest(new TextEncoder().encode("abc"))
      assert.strictEqual(digest.length, 16)
      yield* Crypto.Sha2
    }).pipe(Effect.provide(BunCrypto.layer)))
})

describeCrypto("BunCrypto services", { md5: BunCrypto.layerMd5 })
