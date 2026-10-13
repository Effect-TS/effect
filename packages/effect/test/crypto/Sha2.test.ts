import { assert, describe, it } from "@effect/vitest"
import * as Sha2 from "effect/crypto/Sha2"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import { encode } from "../utils/crypto.ts"

describe("Sha2", () => {
  it.effect("digests with the requested algorithm", () =>
    Effect.gen(function*() {
      const sha2 = yield* Sha2.Sha2
      assert.strictEqual(
        Hex.encode(yield* sha2.digest("SHA-256", encode("abc"))),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
      assert.strictEqual((yield* sha2.digest("SHA-384", encode("abc"))).length, 48)
      assert.strictEqual((yield* sha2.digest("SHA-512", encode("abc"))).length, 64)
    }).pipe(Effect.provide(Sha2.layer)))
})
