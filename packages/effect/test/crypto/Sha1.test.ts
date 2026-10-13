import { assert, describe, it } from "@effect/vitest"
import * as Sha1 from "effect/crypto/Sha1"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import { encode } from "../utils/crypto.ts"

describe("Sha1", () => {
  it.effect("digests with SHA-1", () =>
    Effect.gen(function*() {
      const sha1 = yield* Sha1.Sha1
      assert.strictEqual(Hex.encode(yield* sha1.digest(encode("abc"))), "a9993e364706816aba3e25717850c26c9cd0d89d")
    }).pipe(Effect.provide(Sha1.layer)))
})
