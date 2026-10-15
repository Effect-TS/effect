import { assert, describe, it } from "@effect/vitest"
import * as Aes from "effect/crypto/Aes"
import * as Argon2 from "effect/crypto/Argon2"
import * as ChaCha20Poly1305 from "effect/crypto/ChaCha20Poly1305"
import type * as CryptoError from "effect/crypto/CryptoError"
import * as Ecdh from "effect/crypto/Ecdh"
import * as Ecdsa from "effect/crypto/Ecdsa"
import * as Ed25519 from "effect/crypto/Ed25519"
import * as Rsa from "effect/crypto/Rsa"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as NodeCrypto from "node:crypto"

const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

// Copies bytes into the middle of a larger buffer, so implementations must
// respect the view's offset and length.
const view = (bytes: Uint8Array | string): Uint8Array => {
  const data = typeof bytes === "string" ? Result.getOrThrow(Hex.decode(bytes)) : bytes
  const backing = new Uint8Array(data.length + 8).fill(0xff)
  backing.set(data, 4)
  return backing.subarray(4, 4 + data.length)
}

const assertReason = (
  error: CryptoError.CryptoError,
  method: string,
  reason: CryptoError.CryptoErrorReason["_tag"]
) => {
  assert.strictEqual(error._tag, "CryptoError")
  assert.strictEqual(error.method, method)
  assert.strictEqual(error.reason._tag, reason)
}

/**
 * The layers a platform adds to the Web Crypto layers of `effect/crypto`. Tests
 * of services a platform does not add are skipped.
 */
export interface CryptoLayers {
  readonly chaCha20Poly1305?: Layer.Layer<ChaCha20Poly1305.ChaCha20Poly1305> | undefined
  readonly xChaCha20Poly1305?: Layer.Layer<ChaCha20Poly1305.XChaCha20Poly1305> | undefined
  readonly argon2id?: Layer.Layer<Argon2.Argon2id, CryptoError.CryptoError> | undefined
}

// RFC 8439, section 2.8.2, and draft-irtf-cfrg-xchacha-03, Appendix A.3.1.
const sunscreen = encode(
  "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
)
const chachaKey = "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f"
const chachaAdditionalData = "50515253c0c1c2c3c4c5c6c7"

// Ciphertexts from @noble/ciphers, an independent implementation, for inputs
// derived from the message length. The lengths cross the 16-byte Poly1305 and
// 64-byte ChaCha20 block boundaries.
const pattern = (length: number, seed: number): Uint8Array =>
  Uint8Array.from({ length }, (_, i) => (i * 31 + seed) & 0xff)
const chachaVectors: ReadonlyArray<readonly [number, string]> = [
  [0, "2807203bd4ee0fde08a2123b35489e36"],
  [1, "b6e00b694b1be8b23f62ddba387adffee2"],
  [
    64,
    "f95d6a89f60e2cbe5ba7b8d4b4672843195f4e345fe7e95533f6fd7fa39ba7b9e131afdc89e8f83ee9f53f3ac1986087" +
    "39da0a969b7f02aeba3307be9147d6b7ba701160fb92b509cc9c81bf38443b8f"
  ],
  [
    65,
    "ffac8fb9ad1b9be294b797e36d8498884ab8484858465c90b4471f09046fca819320a1a72dc45da9b193b2fecd171b06" +
    "b41327140b18d6890ba98a526dca68e39ce9ec3b4afccfa602c1f22eb983eee0e3"
  ],
  [
    257,
    "b607f4a84a54cbaf4b1c9e676d75179acf75db4aed97fc2afdc1c6a3ba6dbfc41a37dade42e1db7b92bbbacdab88fe91" +
    "4e9ce0985357659813cdaea63ccc19dcfa869a0d11abb79ccd43bc202ac82f8ff24fe9da496c866df8dcce9c943540f7" +
    "95550604dcd72cc42a521959235b782682d9d76eadf99dc70fa19c5c2309b30b4ff78a685b11430fb0488b4c4a714f48" +
    "4b6f43ae0c7586a30b51f12511de11100de8f27adb3eef40124b025165dce093e6113cea34443b07cfb6dcc40e86a6f4" +
    "bb73140e9a6c56a8e8a981125410938c5bdfc4ffb38034111f3f3e70536d9b036398b07fdfd9ddbb054d1d4a02f7349a" +
    "a0e87753a26b2e31302d9be31c81a96d3c49ccd301e8cf82d1e781e4a9a2ccc2df"
  ]
]
const xchachaVectors: ReadonlyArray<readonly [number, string]> = [
  [0, "d898a645cf6c3bd966a68e11c7c80f7d"],
  [1, "273aba37e7ab18dc75c4649f3caec83b84"],
  [15, "0aee099c390261b4981fadfe98cc53c48bfa5b4fc28fc2487aa973c959c32d"],
  [16, "9ce76155debaf179bdb871118da7e6026f2e694405ffae46f0b763c5b25106ce"],
  [17, "48c6f8a259f84af544d643314dfa654543e7a397c80b9cfff1194d717633d4f144"],
  [
    63,
    "3b97e629901ce340a068226be4c5664f47891598e27a8e3dc7d76f52912613750072ba4f0f7042c84fdac2c2cd9b0202" +
    "64896f896574fcf766853b15809055c5bb5027f17224592efeed37b181e895"
  ],
  [
    64,
    "310c1301d2eefd354c53e04d3fef17bc9960d0fd071366b07221b60e546b7dc0e614b9f138bf7f772605e6486228e66a" +
    "1072937d69cede3fb3a0953e5e3f2989ac9dd34f04b9b61cb1c5f44d05167d73"
  ],
  [
    65,
    "a9669fd7af5ce05b29e0319f549b5fe79b17a179b6af418376020637ca535e91e9d7ce76c0ac012af6e144ade1aacef9" +
    "7b4dc1612054965423005e87d0687e18a8fc1b5812dfab63defb192ccc433fcfac"
  ],
  [
    129,
    "7022d97482782c4908101f46cc5f407407a10219cd8327d518cc6a0ba48736685e7e3a678c63956f78c5c37466f917f5" +
    "b83c6bd42f134897876401f41aafa0c0df0b6e74ab3ff5229ec8a2afa224a1eb63c777121fe350bc6cfb670cd29b41b9" +
    "e30b9b043152ddca67d4e115cd876bee118f08efda54a7e0d04db52667f746767d1e17a4b9c0570a1db420f1943e8e6d" +
    "c1"
  ],
  [
    257,
    "278f051c2e4a5897a6a69caa1f6e4752e6e32df484f7fe628c69274966dd843ad739be8dbd301bc7b99155332dbd660c" +
    "c9e6765713ae43e96bcea676f5985bc193101933b9d823fb3789f93259ba82a3784dd6a4dd04668827a7ea3c3c4926d8" +
    "08bad7265c339e30048434b80b1c1eb56429828a6f2b66132ce7173306185f47a16ce6aa8ebe9d0211df6a0468085992" +
    "da54fcdcb11c321d12248773cb7ee48c132d3a023651a5ea5d50d9735a002b21a21e54407a723a4f9c3889dc2ab22e71" +
    "6ce175d01c6801485754c0b0d2d57e1b532a3e9edee71f1344bac28573355f13a60e008f3682423f8e89e1c01dc80f64" +
    "120a2e119242cf1f540fc9d9d9ff4ee57069a4ad567b41a1b66ba508fe54711101"
  ]
]

/**
 * Runs the tests every platform shares: the Web Crypto behaviour the
 * `effect/crypto` layers rely on, and the services the platform adds.
 */
export const describeCrypto = (label: string, layers: CryptoLayers) =>
  describe(label, () => {
    // The Web Crypto layers themselves are tested in `effect`. These check the
    // runtime behaviour those layers rely on.
    describe("Web Crypto behaviour the layers rely on", () => {
      it.effect("exports Ed25519 private keys in the PKCS8 form Ed25519.privateKeyToRaw reads", () =>
        Effect.gen(function*() {
          const { privateKey } = yield* (yield* Ed25519.Ed25519).generateKeyPair()
          assert.strictEqual(Redacted.value(privateKey).length, 48)
          const seed = yield* Ed25519.privateKeyToRaw(privateKey)
          assert.deepStrictEqual(yield* Ed25519.privateKeyFromRaw(seed), privateKey)
        }).pipe(Effect.provide(Ed25519.layer)))

      it.effect("derives public keys from the private key's JWK export", () =>
        Effect.gen(function*() {
          const ed25519 = yield* Ed25519.Ed25519
          const ecdsa = yield* Ecdsa.Ecdsa
          const rsa = yield* Rsa.Rsa
          const ecdh = yield* Ecdh.Ecdh
          const edPair = yield* ed25519.generateKeyPair()
          assert.deepStrictEqual(yield* Ed25519.publicKeyFromPrivateKey(edPair.privateKey), edPair.publicKey)
          const ecdsaPair = yield* ecdsa.generateKeyPair({ curve: "P-384" })
          assert.deepStrictEqual(
            yield* Ecdsa.publicKeyFromPrivateKey("P-384", ecdsaPair.privateKey),
            ecdsaPair.publicKey
          )
          const rsaPair = yield* rsa.generateKeyPair()
          assert.deepStrictEqual(yield* Rsa.publicKeyFromPrivateKey(rsaPair.privateKey), rsaPair.publicKey)
          for (const curve of ["X25519", "P-256"] as const) {
            const pair = yield* ecdh.generateKeyPair({ curve })
            assert.deepStrictEqual(yield* Ecdh.publicKeyFromPrivateKey(curve, pair.privateKey), pair.publicKey)
          }
        }).pipe(
          Effect.provide(Layer.mergeAll(Ed25519.layer, Ecdsa.layer, Rsa.layer, Ecdh.layer))
        ))

      it.effect("converts keys to and from JSON Web Keys", () =>
        Effect.gen(function*() {
          const ed25519 = yield* (yield* Ed25519.Ed25519).generateKeyPair()
          const edJwk = yield* Ed25519.publicKeyToJwk(ed25519.publicKey)
          assert.deepStrictEqual(yield* Ed25519.publicKeyFromJwk(edJwk), ed25519.publicKey)
          const ecdsa = yield* (yield* Ecdsa.Ecdsa).generateKeyPair({ curve: "P-256" })
          const ecJwk = yield* Ecdsa.publicKeyToJwk("P-256", ecdsa.publicKey)
          assert.deepStrictEqual(yield* Ecdsa.publicKeyFromJwk("P-256", ecJwk), ecdsa.publicKey)
          const key = yield* Aes.keyFromJwk({ kty: "oct", k: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc" })
          assert.deepStrictEqual(Redacted.value(key), new Uint8Array(32).fill(7))
        }).pipe(Effect.provide(Layer.mergeAll(Ed25519.layer, Ecdsa.layer))))

      it.effect("reports a failed AES-GCM authentication as an OperationError", () =>
        Effect.gen(function*() {
          const aes = yield* Aes.Aes
          const key = yield* aes.generateKey()
          const nonce = new Uint8Array(12)
          const sealed = yield* aes.encryptGcm({ key, nonce, data: encode("data") })
          sealed[0] ^= 1
          assertReason(
            yield* Effect.flip(aes.decryptGcm({ key, nonce, data: sealed })),
            "decryptGcm",
            "DecryptionFailed"
          )
        }).pipe(Effect.provide(Aes.layer)))

      it.effect("rejects AES-CTR data that would repeat a counter block", () =>
        Effect.gen(function*() {
          const aes = yield* Aes.Aes
          const key = yield* aes.generateKey()
          // Three blocks need more than the two values of a 1-bit counter.
          const options = { key, counter: new Uint8Array(16), counterLength: 1, data: new Uint8Array(33) }
          assertReason(yield* Effect.flip(aes.encryptCtr(options)), "encryptCtr", "InvalidArgument")
        }).pipe(Effect.provide(Aes.layer)))

      it.effect("derives full-length P-521 shared secrets", () =>
        Effect.gen(function*() {
          const ecdh = yield* Ecdh.Ecdh
          const first = yield* ecdh.generateKeyPair({ curve: "P-521" })
          const second = yield* ecdh.generateKeyPair({ curve: "P-521" })
          const shared = yield* ecdh.deriveSharedSecret({
            curve: "P-521",
            privateKey: first.privateKey,
            publicKey: second.publicKey
          })
          // 66 bytes: the 521-bit coordinate padded to whole bytes.
          assert.strictEqual(Redacted.value(shared).length, 66)
          assert.deepStrictEqual(
            yield* ecdh.deriveSharedSecret({
              curve: "P-521",
              privateKey: second.privateKey,
              publicKey: first.publicKey
            }),
            shared
          )
        }).pipe(Effect.provide(Ecdh.layer)))

      it.effect("rejects a small-order X25519 peer key", () =>
        Effect.gen(function*() {
          const ecdh = yield* Ecdh.Ecdh
          const { privateKey } = yield* ecdh.generateKeyPair({ curve: "X25519" })
          // Some runtimes reject the point; others return zeros, which the layer rejects.
          const error = yield* Effect.flip(
            ecdh.deriveSharedSecret({
              curve: "X25519",
              privateKey,
              publicKey: yield* Ecdh.publicKeyFromRaw("X25519", new Uint8Array(32))
            })
          )
          assertReason(error, "deriveSharedSecret", "InvalidKey")
        }).pipe(Effect.provide(Ecdh.layer)))
    })

    it.effect.skipIf(layers.chaCha20Poly1305 === undefined)("encrypts with ChaCha20-Poly1305", () =>
      Effect.gen(function*() {
        const chacha = yield* ChaCha20Poly1305.ChaCha20Poly1305
        const options = {
          key: Redacted.make(view(chachaKey)),
          nonce: view("070000004041424344454647"),
          additionalData: view(chachaAdditionalData)
        }
        const sealed = yield* chacha.encrypt({ ...options, data: view(sunscreen) })
        assert.strictEqual(
          Hex.encode(sealed),
          "d31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b" +
            "1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc" +
            "3ff4def08e4b7a9de576d26586cec64b61161ae10b594f09e26a7e902ecbd0600691"
        )
        assert.deepStrictEqual(yield* chacha.decrypt({ ...options, data: view(sealed) }), sunscreen)

        // Interoperates with an independent implementation in both directions.
        for (const [length, expected] of chachaVectors) {
          const vector = {
            key: Redacted.make(pattern(32, length)),
            nonce: pattern(12, length + 1),
            additionalData: pattern(length % 17, length + 2)
          }
          const message = pattern(length, length + 3)
          assert.strictEqual(Hex.encode(yield* chacha.encrypt({ ...vector, data: message })), expected)
          assert.deepStrictEqual(yield* chacha.decrypt({ ...vector, data: view(expected) }), message)
        }

        const tampered = sealed.slice()
        tampered[sealed.length - 1] ^= 1
        assertReason(
          yield* Effect.flip(chacha.decrypt({ ...options, data: tampered })),
          "decrypt",
          "DecryptionFailed"
        )
        assertReason(
          yield* Effect.flip(chacha.decrypt({ ...options, data: new Uint8Array(15) })),
          "decrypt",
          "DecryptionFailed"
        )
        assertReason(
          yield* Effect.flip(chacha.encrypt({ ...options, nonce: new Uint8Array(24), data: sunscreen })),
          "encrypt",
          "InvalidArgument"
        )
        // A key of the wrong length is a key error, not a failed authentication,
        // even when the ciphertext is also too short.
        const shortKey = Redacted.make(new Uint8Array(16))
        for (const data of [sealed, new Uint8Array(15)]) {
          assertReason(yield* Effect.flip(chacha.decrypt({ ...options, key: shortKey, data })), "decrypt", "InvalidKey")
        }

        const generated = yield* chacha.generateKey()
        assert.strictEqual(Redacted.value(generated).length, 32)
        assert.deepStrictEqual(
          yield* chacha.decrypt({
            ...options,
            key: generated,
            data: yield* chacha.encrypt({ ...options, key: generated, data: sunscreen })
          }),
          sunscreen
        )
      }).pipe(Effect.provide(layers.chaCha20Poly1305!)))

    it.effect.skipIf(layers.xChaCha20Poly1305 === undefined)("encrypts with XChaCha20-Poly1305", () =>
      Effect.gen(function*() {
        const xchacha = yield* ChaCha20Poly1305.XChaCha20Poly1305
        const options = {
          key: Redacted.make(view(chachaKey)),
          nonce: view("404142434445464748494a4b4c4d4e4f5051525354555657"),
          additionalData: view(chachaAdditionalData)
        }
        const sealed = yield* xchacha.encrypt({ ...options, data: view(sunscreen) })
        assert.strictEqual(
          Hex.encode(sealed),
          "bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb731c7f1b0b4aa6440bf3a82f4eda7e39" +
            "ae64c6708c54c216cb96b72e1213b4522f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff9" +
            "21f9664c97637da9768812f615c68b13b52ec0875924c1c7987947deafd8780acf49"
        )
        assert.deepStrictEqual(yield* xchacha.decrypt({ ...options, data: view(sealed) }), sunscreen)

        // Interoperates with an independent implementation in both directions.
        for (const [length, expected] of xchachaVectors) {
          const vector = {
            key: Redacted.make(pattern(32, length)),
            nonce: pattern(24, length + 1),
            additionalData: pattern(length % 17, length + 2)
          }
          const message = pattern(length, length + 3)
          assert.strictEqual(Hex.encode(yield* xchacha.encrypt({ ...vector, data: message })), expected)
          assert.deepStrictEqual(yield* xchacha.decrypt({ ...vector, data: view(expected) }), message)
        }

        const tampered = sealed.slice()
        tampered[0] ^= 1
        assertReason(
          yield* Effect.flip(xchacha.decrypt({ ...options, data: tampered })),
          "decrypt",
          "DecryptionFailed"
        )
        assertReason(
          yield* Effect.flip(xchacha.decrypt({ ...options, additionalData: undefined, data: sealed })),
          "decrypt",
          "DecryptionFailed"
        )
        assertReason(
          yield* Effect.flip(xchacha.decrypt({ ...options, data: sealed.subarray(0, 15) })),
          "decrypt",
          "DecryptionFailed"
        )
        assertReason(
          yield* Effect.flip(xchacha.encrypt({ ...options, nonce: new Uint8Array(12), data: sunscreen })),
          "encrypt",
          "InvalidArgument"
        )

        const generated = yield* xchacha.generateKey()
        assert.deepStrictEqual(
          yield* xchacha.decrypt({
            ...options,
            key: generated,
            data: yield* xchacha.encrypt({ ...options, key: generated, data: sunscreen })
          }),
          sunscreen
        )
      }).pipe(Effect.provide(layers.xChaCha20Poly1305!)))

    it.effect.skipIf(layers.argon2id === undefined)("derives Argon2id hashes where the runtime supports them", () =>
      Effect.gen(function*() {
        if (typeof NodeCrypto.argon2 !== "function") {
          const error = yield* Effect.flip(Layer.build(layers.argon2id!))
          assertReason(error, "layer", "Unsupported")
          return
        }
        // RFC 9106, section 5.3.
        const options = {
          password: Redacted.make(view(new Uint8Array(32).fill(1))),
          salt: view(new Uint8Array(16).fill(2)),
          secret: Redacted.make(view(new Uint8Array(8).fill(3))),
          associatedData: view(new Uint8Array(12).fill(4)),
          memoryKiB: 32,
          passes: 3,
          parallelism: 4
        }
        const expected = "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659"
        const program = Effect.gen(function*() {
          const argon2id = yield* Argon2.Argon2id
          assert.strictEqual(Hex.encode(Redacted.value(yield* argon2id.derive({ ...options, length: 32 }))), expected)
          assert.isTrue(yield* argon2id.verify({ ...options, expected: view(expected) }))
          assert.isFalse(
            yield* argon2id.verify({ ...options, password: Redacted.make(encode("wrong")), expected: view(expected) })
          )
          // A stored hash shorter than the 4-byte minimum output never matches.
          assert.isFalse(yield* argon2id.verify({ ...options, expected: new Uint8Array(3) }))
          assertReason(
            yield* Effect.flip(argon2id.verify({ ...options, passes: 0, expected: new Uint8Array(3) })),
            "verify",
            "InvalidArgument"
          )
          assertReason(
            yield* Effect.flip(argon2id.derive({ ...options, salt: new Uint8Array(7), length: 32 })),
            "derive",
            "InvalidArgument"
          )
        })
        yield* program.pipe(Effect.provide(layers.argon2id!))
      }))
  })
