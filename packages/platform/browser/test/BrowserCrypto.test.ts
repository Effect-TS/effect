import * as BrowserCrypto from "@effect/platform-browser/BrowserCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Aead from "effect/crypto/Aead"
import * as Cipher from "effect/crypto/Cipher"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as KeyAgreement from "effect/crypto/KeyAgreement"
import * as KeyWrap from "effect/crypto/KeyWrap"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"

describe("BrowserCrypto", () => {
  it("individual layers are the core WebCrypto layers", () => {
    assert.strictEqual(BrowserCrypto.layerSecureRandom, SecureRandom.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerDigest, Digest.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerMac, Mac.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerKdf, Kdf.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerAead, Aead.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerCipher, Cipher.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerSignature, Signature.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerKeyAgreement, KeyAgreement.layerWebCrypto)
    assert.strictEqual(BrowserCrypto.layerKeyWrap, KeyWrap.layerWebCrypto)
  })

  it.effect("layer provides every crypto service", () =>
    Effect.gen(function*() {
      yield* SecureRandom.SecureRandom
      yield* Mac.Mac
      yield* Kdf.Kdf
      yield* Aead.Aead
      yield* Cipher.Cipher
      yield* Signature.Signature
      yield* KeyAgreement.KeyAgreement
      yield* KeyWrap.KeyWrap
      const digest = yield* Digest.Digest
      // FIPS 180-2 "abc" vector.
      assert.strictEqual(
        yield* digest.digestHex(Digest.sha256, new TextEncoder().encode("abc")),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
      )
    }).pipe(Effect.provide(BrowserCrypto.layer)))
})
