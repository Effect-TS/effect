import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import { describeCrypto } from "../../node-shared/test/Crypto.test-utils.ts"

describe("NodeCrypto", () => {
  it.effect("layerDigest computes MD5 and SHA digests", () =>
    Effect.gen(function*() {
      const digest = yield* Digest.Digest
      const abc = new TextEncoder().encode("abc")
      // RFC 1321 and FIPS 180-2 "abc" vectors.
      assert.strictEqual(yield* digest.digestHex(Digest.md5, abc), "900150983cd24fb0d6963f7d28e17f72")
      assert.strictEqual(yield* digest.digestHex(Digest.sha1, abc), "a9993e364706816aba3e25717850c26c9cd0d89d")
      assert.strictEqual(
        yield* digest.digestHex(Digest.sha256, abc),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
      assert.strictEqual((yield* digest.digest(Digest.sha512, abc)).length, 64)
    }).pipe(Effect.provide(NodeCrypto.layerDigest)))

  it("layerSecureRandom is the core layer", () => {
    assert.strictEqual(NodeCrypto.layerSecureRandom, SecureRandom.layerWebCrypto)
  })
})

describeCrypto("NodeCrypto services", {
  chaCha20Poly1305: NodeCrypto.layerChaCha20Poly1305,
  xChaCha20Poly1305: NodeCrypto.layerXChaCha20Poly1305,
  argon2id: NodeCrypto.layerArgon2id
})
