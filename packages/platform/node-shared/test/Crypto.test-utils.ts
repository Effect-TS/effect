import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as Layer from "effect/Layer"
import * as NodeCrypto from "node:crypto"

const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex")
const encode = (text: string): Uint8Array => new TextEncoder().encode(text)

// Copies bytes into the middle of a larger buffer, so implementations must
// respect the view's offset and length.
const view = (bytes: Uint8Array | string): Uint8Array => {
  const data = typeof bytes === "string" ? Buffer.from(bytes, "hex") : bytes
  const backing = new Uint8Array(data.length + 8).fill(0xff)
  backing.set(data, 4)
  return backing.subarray(4, 4 + data.length)
}

const supportsArgon2id = (): boolean => {
  if (typeof NodeCrypto.argon2Sync !== "function") return false
  try {
    NodeCrypto.argon2Sync("argon2id", {
      message: new Uint8Array(),
      nonce: new Uint8Array(8),
      memory: 8,
      passes: 1,
      parallelism: 1,
      tagLength: 4
    })
    return true
  } catch {
    // Some runtimes export an Argon2 stub without engine support.
    return false
  }
}

/**
 * Runs known-answer and interoperability tests against a platform `Crypto`
 * layer. `md5` states whether the runtime provides MD5 digests, and `native`
 * whether it provides Argon2id and XChaCha20-Poly1305 where the runtime's
 * `node:crypto` does. Unsupported operations must fail with a `PlatformError`.
 */
export const describeCrypto = (
  label: string,
  layer: Layer.Layer<Crypto.Crypto>,
  options: { readonly md5: boolean; readonly native: boolean }
) =>
  describe(label, () => {
    it.effect("computes digests", () =>
      Effect.gen(function*() {
        // FIPS 180-4 and RFC 1321 "abc" vectors.
        for (
          const [algorithm, expected] of [
            ["SHA-1", "a9993e364706816aba3e25717850c26c9cd0d89d"],
            ["SHA-256", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
            [
              "SHA-384",
              "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7"
            ],
            [
              "SHA-512",
              "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
              "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
            ]
          ] as const
        ) {
          assert.strictEqual(hex(yield* Crypto.digest(algorithm, view(encode("abc")))), expected)
        }
        if (options.md5) {
          assert.strictEqual(hex(yield* Crypto.digest("MD5", encode("abc"))), "900150983cd24fb0d6963f7d28e17f72")
        } else {
          const error = yield* Effect.flip(Crypto.digest("MD5", encode("abc")))
          assert.strictEqual(error.reason.method, "digest")
          assert.strictEqual(error.reason._tag, "Unsupported")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("computes HMACs", () =>
      Effect.gen(function*() {
        // RFC 2202 and RFC 4231, test case 1.
        const key = view(new Uint8Array(20).fill(0x0b))
        const data = view(encode("Hi There"))
        for (
          const [algorithm, expected] of [
            ["SHA-1", "b617318655057264e28bc0b6fb378c8ef146be00"],
            ["SHA-256", "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"],
            [
              "SHA-384",
              "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6"
            ],
            [
              "SHA-512",
              "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cde" +
              "daa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854"
            ]
          ] as const
        ) {
          assert.strictEqual(hex(yield* Crypto.hmac(algorithm, key, data)), expected)
        }
        assert.strictEqual(
          hex(yield* Crypto.hmac("SHA-256", new Uint8Array(), data)),
          NodeCrypto.createHmac("sha256", new Uint8Array()).update(data).digest("hex")
        )
      }).pipe(Effect.provide(layer)))

    it.effect("verifies HMACs and rejects altered or truncated MACs", () =>
      Effect.gen(function*() {
        const key = view(new Uint8Array(20).fill(0x0b))
        const data = view(encode("Hi There"))
        const signature = view("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7")
        assert.strictEqual(yield* Crypto.hmacVerify("SHA-256", key, signature, data), true)
        const altered = signature.slice()
        altered[0] ^= 1
        assert.strictEqual(yield* Crypto.hmacVerify("SHA-256", key, altered, data), false)
        assert.strictEqual(yield* Crypto.hmacVerify("SHA-256", key, signature.subarray(0, 16), data), false)
      }).pipe(Effect.provide(layer)))

    it.effect("derives PBKDF2 and HKDF keys", () =>
      Effect.gen(function*() {
        // RFC 6070 test case 2, and its widely published SHA-256 counterpart.
        const password = view(encode("password"))
        const salt = view(encode("salt"))
        assert.strictEqual(
          hex(yield* Crypto.pbkdf2({ hash: "SHA-1", password, salt, iterations: 2, length: 20 })),
          "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957"
        )
        assert.strictEqual(
          hex(yield* Crypto.pbkdf2({ hash: "SHA-256", password, salt, iterations: 2, length: 32 })),
          "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43"
        )
        // RFC 5869, Appendix A.1.
        assert.strictEqual(
          hex(
            yield* Crypto.hkdf({
              hash: "SHA-256",
              key: view(new Uint8Array(22).fill(0x0b)),
              salt: view("000102030405060708090a0b0c"),
              info: view("f0f1f2f3f4f5f6f7f8f9"),
              length: 42
            })
          ),
          "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
        )
        assert.strictEqual(
          hex(yield* Crypto.hkdf({ hash: "SHA-256", key: view(new Uint8Array(22).fill(0x0b)), length: 42 })),
          "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8"
        )
      }).pipe(Effect.provide(layer)))

    it.effect("owns KDF inputs before asynchronous work", () =>
      Effect.gen(function*() {
        const password = view(encode("password"))
        const salt = view(encode("salt"))
        const options = { hash: "SHA-1" as const, password, salt, iterations: 2, length: 20 }
        const fiber = yield* Crypto.pbkdf2(options).pipe(Effect.forkChild({ startImmediately: true }))
        password.fill(0)
        salt.fill(0)
        options.iterations = 1
        assert.strictEqual(hex(yield* Fiber.join(fiber)), "ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957")
      }).pipe(Effect.provide(layer)))

    it.effect("derives Argon2id keys where the runtime supports them", () =>
      Effect.gen(function*() {
        // RFC 9106, section 5.3.
        const derive = Crypto.argon2id({
          password: view(new Uint8Array(32).fill(1)),
          salt: view(new Uint8Array(16).fill(2)),
          secret: view(new Uint8Array(8).fill(3)),
          associatedData: view(new Uint8Array(12).fill(4)),
          memoryKiB: 32,
          passes: 3,
          parallelism: 4,
          length: 32
        })
        if (options.native && supportsArgon2id()) {
          assert.strictEqual(hex(yield* derive), "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659")
        } else {
          const error = yield* Effect.flip(derive)
          assert.strictEqual(error.reason.method, "argon2id")
          assert.strictEqual(error.reason._tag, "Unsupported")
        }
      }).pipe(Effect.provide(layer)))

    it.effect("encrypts with XChaCha20-Poly1305 where the runtime supports it", () =>
      Effect.gen(function*() {
        // draft-irtf-cfrg-xchacha-03, Appendix A.3.1.
        const input: Crypto.XChaCha20Poly1305Options = {
          key: view("808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f"),
          nonce: view("404142434445464748494a4b4c4d4e4f5051525354555657"),
          additionalData: view("50515253c0c1c2c3c4c5c6c7"),
          data: view(encode(
            "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
          ))
        }
        if (!(options.native && NodeCrypto.getCiphers().includes("chacha20-poly1305"))) {
          const error = yield* Effect.flip(Crypto.xchacha20poly1305Encrypt(input))
          assert.strictEqual(error.reason.method, "xchacha20poly1305Encrypt")
          assert.strictEqual(error.reason._tag, "Unsupported")
          return
        }
        const ciphertext = yield* Crypto.xchacha20poly1305Encrypt(input)
        assert.strictEqual(
          hex(ciphertext),
          "bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb731c7f1b0b4aa6440bf3a82f4eda7e39" +
            "ae64c6708c54c216cb96b72e1213b4522f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff9" +
            "21f9664c97637da9768812f615c68b13b52ec0875924c1c7987947deafd8780acf49"
        )
        assert.deepStrictEqual(yield* Crypto.xchacha20poly1305Decrypt({ ...input, data: view(ciphertext) }), input.data)
        const tampered = ciphertext.slice()
        tampered[0] ^= 1
        const error = yield* Effect.flip(Crypto.xchacha20poly1305Decrypt({ ...input, data: tampered }))
        assert.strictEqual(error.reason.method, "xchacha20poly1305Decrypt")
        assert.strictEqual(error.reason._tag, "InvalidData")
      }).pipe(Effect.provide(layer)))

    it.effect("encrypts with AES-GCM and rejects tampered ciphertext", () =>
      Effect.gen(function*() {
        // NIST GCM specification, test case 2.
        const key = yield* Crypto.importKey("raw", view(new Uint8Array(16)), { name: "AES-GCM", length: 128 })
        const cipher: Crypto.CipherOptions = { name: "AES-GCM", iv: view(new Uint8Array(12)) }
        const ciphertext = yield* Crypto.encrypt(cipher, key, view(new Uint8Array(16)))
        assert.strictEqual(hex(ciphertext), "0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf")
        assert.deepStrictEqual(yield* Crypto.decrypt(cipher, key, view(ciphertext)), new Uint8Array(16))
        const withData = yield* Effect.flip(
          Crypto.decrypt({ ...cipher, additionalData: Uint8Array.of(1) }, key, ciphertext)
        )
        assert.strictEqual(withData.reason.method, "decrypt")
        assert.strictEqual(withData.reason._tag, "InvalidData")
      }).pipe(Effect.provide(layer)))

    it.effect("encrypts with AES-CTR", () =>
      Effect.gen(function*() {
        // NIST SP 800-38A, F.5.1.
        const key = yield* Crypto.importKey("raw", view("2b7e151628aed2a6abf7158809cf4f3c"), {
          name: "AES-CTR",
          length: 128
        })
        const cipher: Crypto.CipherOptions = {
          name: "AES-CTR",
          counter: view("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff"),
          length: 128
        }
        const plaintext = view("6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51")
        const ciphertext = yield* Crypto.encrypt(cipher, key, plaintext)
        assert.strictEqual(hex(ciphertext), "874d6191b620e3261bef6864990db6ce9806f66b7970fdff8617187bb9fffdff")
        assert.deepStrictEqual(yield* Crypto.decrypt(cipher, key, ciphertext), plaintext)
      }).pipe(Effect.provide(layer)))

    it.effect("encrypts with RSA-OAEP keys and SPKI bytes", () =>
      Effect.gen(function*() {
        const pair = yield* Crypto.generateKeyPair({ name: "RSA-OAEP", hash: "SHA-256" }, { extractable: true })
        const publicKey = yield* Crypto.exportKey("spki", pair.publicKey)
        const data = view(Uint8Array.of(0, 255, 128, 42))
        const label = view(encode("label"))
        const imported = yield* Crypto.importKey("spki", view(publicKey), { name: "RSA-OAEP", hash: "SHA-256" })
        const ciphertext = yield* Crypto.encrypt({ name: "RSA-OAEP", label }, imported, data)
        assert.deepStrictEqual(yield* Crypto.decrypt({ name: "RSA-OAEP", label }, pair.privateKey, ciphertext), data)
        const native = NodeCrypto.privateDecrypt({
          key: NodeCrypto.createPrivateKey({
            key: Buffer.from(yield* Crypto.exportKey("pkcs8", pair.privateKey)),
            format: "der",
            type: "pkcs8"
          }),
          padding: NodeCrypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
          oaepLabel: Buffer.from(label)
        }, ciphertext)
        assert.deepStrictEqual(Uint8Array.from(native), data)
        const encrypted = yield* Crypto.encrypt({ name: "RSA-OAEP", label }, pair.publicKey, data)
        const wrongLabel = yield* Effect.flip(Crypto.decrypt({ name: "RSA-OAEP" }, pair.privateKey, encrypted))
        assert.strictEqual(wrongLabel.reason.method, "decrypt")
      }).pipe(Effect.provide(layer)))

    it.effect("signs and verifies with every signature algorithm", () =>
      Effect.gen(function*() {
        // RFC 8032, section 7.1, test 1.
        const ed25519: Crypto.KeyPairAlgorithm = { name: "Ed25519" }
        const signer = yield* Crypto.importKey(
          "pkcs8",
          view("302e020100300506032b6570042204209d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"),
          ed25519
        )
        const verifier = yield* Crypto.importKey(
          "raw",
          view("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"),
          ed25519
        )
        const signature = yield* Crypto.sign(ed25519, signer, new Uint8Array())
        assert.strictEqual(
          hex(signature),
          "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555f" +
            "b8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
        )
        assert.isTrue(yield* Crypto.verify(ed25519, verifier, signature, new Uint8Array()))

        const data = view(encode("signed data"))
        for (
          const [algorithm, signing, native] of [
            [{ name: "RSA-PSS", hash: "SHA-256" }, { name: "RSA-PSS" }, {
              padding: NodeCrypto.constants.RSA_PKCS1_PSS_PADDING,
              saltLength: 32
            }],
            [{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, { name: "RSASSA-PKCS1-v1_5" }, {}],
            [{ name: "ECDSA", namedCurve: "P-256" }, { name: "ECDSA", hash: "SHA-256" }, {
              dsaEncoding: "ieee-p1363" as const
            }]
          ] as const
        ) {
          const pair = yield* Crypto.generateKeyPair(algorithm)
          const signature = yield* Crypto.sign(signing, pair.privateKey, data)
          assert.isTrue(yield* Crypto.verify(signing, pair.publicKey, view(signature), data))
          assert.isFalse(yield* Crypto.verify(signing, pair.publicKey, signature, encode("other data")))
          const publicKey = NodeCrypto.createPublicKey({
            key: Buffer.from(yield* Crypto.exportKey("spki", pair.publicKey)),
            format: "der",
            type: "spki"
          })
          assert.isTrue(NodeCrypto.verify("sha256", data, { key: publicKey, ...native }, signature))
        }
      }).pipe(Effect.provide(layer)))

    it.effect("derives ECDH and X25519 shared secrets", () =>
      Effect.gen(function*() {
        // RFC 7748, section 6.1, with Alice's private scalar wrapped in PKCS8.
        const x25519: Crypto.KeyPairAlgorithm = { name: "X25519" }
        const alice = yield* Crypto.importKey(
          "pkcs8",
          view("302e020100300506032b656e0422042077076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a"),
          x25519
        )
        const bob = yield* Crypto.importKey(
          "raw",
          view("de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f"),
          x25519
        )
        assert.strictEqual(
          hex(yield* Crypto.deriveSharedSecret(alice, bob)),
          "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742"
        )
        // A small-order point produces an all-zero secret, which RFC 7748 rejects.
        const smallOrder = yield* Crypto.importKey("raw", new Uint8Array(32), x25519)
        const error = yield* Effect.flip(Crypto.deriveSharedSecret(alice, smallOrder))
        assert.strictEqual(error.reason.method, "deriveSharedSecret")
        assert.strictEqual(error.reason._tag, "InvalidData")

        for (const [namedCurve, length] of [["P-256", 32], ["P-384", 48], ["P-521", 66]] as const) {
          const algorithm: Crypto.KeyPairAlgorithm = { name: "ECDH", namedCurve }
          const first = yield* Crypto.generateKeyPair(algorithm)
          const second = yield* Crypto.generateKeyPair(algorithm)
          const received = yield* Crypto.importKey("raw", yield* Crypto.exportKey("raw", second.publicKey), algorithm)
          const secret = yield* Crypto.deriveSharedSecret(first.privateKey, received)
          assert.strictEqual(secret.length, length)
          assert.deepStrictEqual(yield* Crypto.deriveSharedSecret(second.privateKey, first.publicKey), secret)
        }
      }).pipe(Effect.provide(layer)))

    it.effect("enforces key extractability and usages", () =>
      Effect.gen(function*() {
        const hmac = { name: "HMAC", hash: "SHA-256" } as const
        const generated = yield* Crypto.generateSecretKey(hmac)
        assert.isFalse(generated.extractable)
        const notExtractable = yield* Effect.flip(Crypto.exportKey("raw", generated))
        assert.strictEqual(notExtractable.reason.method, "exportKey")

        const raw = new Uint8Array(20).fill(0x0b)
        const data = encode("Hi There")
        const signer = yield* Crypto.importKey("raw", raw, hmac, { usages: ["sign"] })
        const signature = yield* Crypto.sign({ name: "HMAC" }, signer, data)
        assert.deepStrictEqual(signature, yield* Crypto.hmac("SHA-256", raw, data))
        const notVerifier = yield* Effect.flip(Crypto.verify({ name: "HMAC" }, signer, signature, data))
        assert.strictEqual(notVerifier.reason.method, "verify")

        const malformed = yield* Effect.flip(Crypto.importKey("spki", Uint8Array.of(0, 1, 2), { name: "Ed25519" }))
        assert.strictEqual(malformed.reason.method, "importKey")
        assert.strictEqual(malformed.reason._tag, "InvalidData")
      }).pipe(Effect.provide(layer)))

    it.effect("round-trips keys through JWK", () =>
      Effect.gen(function*() {
        const aes = { name: "AES-GCM", length: 256 } as const
        const secret = yield* Crypto.generateSecretKey(aes, { extractable: true, usages: ["encrypt"] })
        const jwk = yield* Crypto.exportJwk(secret)
        assert.strictEqual(jwk.kty, "oct")
        const imported = yield* Crypto.importJwk(jwk, aes, { extractable: true })
        assert.deepStrictEqual(imported.usages, ["encrypt"])
        assert.deepStrictEqual(yield* Crypto.exportKey("raw", imported), yield* Crypto.exportKey("raw", secret))

        const ecdsa = { name: "ECDSA", namedCurve: "P-256" } as const
        const pair = yield* Crypto.generateKeyPair(ecdsa, { extractable: true })
        for (const [key, format] of [[pair.publicKey, "spki"], [pair.privateKey, "pkcs8"]] as const) {
          const restored = yield* Crypto.importJwk(yield* Crypto.exportJwk(key), ecdsa, { extractable: true })
          assert.strictEqual(restored.type, key.type)
          assert.deepStrictEqual(yield* Crypto.exportKey(format, restored), yield* Crypto.exportKey(format, key))
        }
      }).pipe(Effect.provide(layer)))
  })
