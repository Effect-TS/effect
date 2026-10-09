import { assert, describe, layer } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import { Reader, utf8, Writer } from "effect/ssh/internal/wire"
import type * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"
import { readFileSync } from "node:fs"

// A `Crypto` service backed by the runtime's WebCrypto implementation.
const CryptoLive = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    ...Crypto.makeSubtle(globalThis.crypto.subtle),
    randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size))
  })
)

// Fixtures were generated with OpenSSH_10.5p1 `ssh-keygen`. The fingerprints
// below are the output of `ssh-keygen -lf <name>.pub` for each fixture.
const fixture = (name: string): string => readFileSync(new URL(`./fixtures/keys/${name}`, import.meta.url), "utf8")

interface PrivateKeyFixture {
  readonly name: string
  readonly format: string
  readonly type: SshKey.KeyType
  readonly comment: string
  readonly fingerprint: string
}

const privateKeyFixtures: ReadonlyArray<PrivateKeyFixture> = [
  {
    name: "openssh_ed25519",
    format: "OpenSSH",
    type: "ssh-ed25519",
    comment: "ed25519@fixture",
    fingerprint: "SHA256:ieoc2wE6DCz2yVhgfcT6bum9f0l+iCd+Fy+/KRlwjWY"
  },
  {
    name: "openssh_ecdsa256",
    format: "OpenSSH",
    type: "ecdsa-sha2-nistp256",
    comment: "ecdsa256@fixture",
    fingerprint: "SHA256:OJKyvxbZuRi7zHKF0AohJ2UG3mtHEvwTj2TVkM2J5vk"
  },
  {
    name: "openssh_ecdsa384",
    format: "OpenSSH",
    type: "ecdsa-sha2-nistp384",
    comment: "ecdsa384@fixture",
    fingerprint: "SHA256:i62oy7BnaQnXwy42HIl0TFUZRQUElJzoaFy7Wunlip8"
  },
  {
    name: "openssh_ecdsa521",
    format: "OpenSSH",
    type: "ecdsa-sha2-nistp521",
    comment: "ecdsa521@fixture",
    fingerprint: "SHA256:DjffAQkktxy63lpMcKkUH4gc0jDuSDg9m5MzMGNBr4c"
  },
  {
    name: "openssh_rsa",
    format: "OpenSSH",
    type: "ssh-rsa",
    comment: "rsa@fixture",
    fingerprint: "SHA256:1UEPmDZyBl6kRA9+bncVdK+wpbLePmiw0qgv2Eot+GI"
  },
  {
    name: "pem_rsa",
    format: "PKCS#1",
    type: "ssh-rsa",
    comment: "",
    fingerprint: "SHA256:DProyZODS0l/HPVjBci9y/guZDxHXYdg/J2dh2s5VfI"
  },
  {
    name: "pem_ecdsa256",
    format: "SEC1",
    type: "ecdsa-sha2-nistp256",
    comment: "",
    fingerprint: "SHA256:aJwB48fUP7naD//cd9BFG93aVKbUKSYw9h36zseYAjc"
  },
  {
    name: "pem_ecdsa384",
    format: "SEC1",
    type: "ecdsa-sha2-nistp384",
    comment: "",
    fingerprint: "SHA256:10eHVRheaS7qVk1zts1bczia/QS6I+sUHGGYVspsH/Q"
  },
  {
    name: "pkcs8_ed25519",
    format: "PKCS#8",
    type: "ssh-ed25519",
    comment: "",
    fingerprint: "SHA256:iVFtasZeL8GKKAWmifQBUwR1fCnKz1/PVUnuuFBM26Y"
  },
  {
    name: "pkcs8_ecdsa256",
    format: "PKCS#8",
    type: "ecdsa-sha2-nistp256",
    comment: "",
    fingerprint: "SHA256:H2VaJxkklxJ4QJE/tVwDUNKfm6XGwSn0TWYYKrDF3nY"
  },
  {
    name: "pkcs8_ecdsa521",
    format: "PKCS#8",
    type: "ecdsa-sha2-nistp521",
    comment: "",
    fingerprint: "SHA256:sYGEHB+Uco1+i9JlbdzoFFEHuyZudpQSA+BEB+nJ1no"
  },
  {
    name: "pkcs8_rsa",
    format: "PKCS#8",
    type: "ssh-rsa",
    comment: "",
    fingerprint: "SHA256:sIP1XGbb6V6ziY4OpCDNz0k8vLo0y40RHGYARcR9KBg"
  }
]

const allKeyTypes: ReadonlyArray<SshKey.KeyType> = [
  "ssh-ed25519",
  "ecdsa-sha2-nistp256",
  "ecdsa-sha2-nistp384",
  "ecdsa-sha2-nistp521",
  "ssh-rsa"
]

const data = utf8("data to be signed")

const assertKeyError = (error: SshError.SshError, includes: string) => {
  assert.strictEqual(error._tag, "SshError")
  assert.strictEqual(error.reason._tag, "SshKeyError")
  assert.include(error.message, includes)
}

const parsePublicKeyUnsafe = (text: string): SshKey.PublicKey => {
  const result = SshKey.parsePublicKey(text)
  if (Result.isFailure(result)) throw result.failure
  return result.success
}

const signatureAlgorithm = (signature: Uint8Array): string => new Reader(signature).utf8()

/** Flips the last byte of a signature blob, which lies inside the raw signature. */
const tamper = (signature: Uint8Array): Uint8Array => {
  const copy = signature.slice()
  copy[copy.length - 1] ^= 0x01
  return copy
}

const signAndVerify = (key: SshKey.PrivateKey) =>
  Effect.gen(function*() {
    const algorithms = SshKey.signatureAlgorithms(key.type)
    assert.isAbove(algorithms.length, 0)
    for (const algorithm of algorithms) {
      const signature = yield* key.sign(data, algorithm)
      assert.strictEqual(signatureAlgorithm(signature), algorithm)
      assert.isTrue(yield* SshKey.verify(key.publicKey, data, signature))
      assert.isFalse(yield* SshKey.verify(key.publicKey, utf8("other data"), signature))
      assert.isFalse(yield* SshKey.verify(key.publicKey, data, tamper(signature)))
    }
  })

layer(CryptoLive, { excludeTestServices: true })("SshKey", (it) => {
  describe("parsePrivateKey", () => {
    for (const { comment, fingerprint, format, name, type } of privateKeyFixtures) {
      it.effect(`parses ${format} ${type} (${name})`, () =>
        Effect.gen(function*() {
          const key = yield* SshKey.parsePrivateKey(fixture(name))
          assert.isTrue(SshKey.isPrivateKey(key))
          assert.isTrue(SshKey.isPublicKey(key.publicKey))
          assert.strictEqual(key.type, type)
          assert.strictEqual(key.publicKey.type, type)
          assert.strictEqual(key.publicKey.comment, comment)
          assert.strictEqual(yield* SshKey.fingerprint(key.publicKey), fingerprint)

          const publicKey = parsePublicKeyUnsafe(fixture(`${name}.pub`))
          assert.isTrue(SshKey.equals(key.publicKey, publicKey))
          assert.strictEqual(yield* SshKey.fingerprint(publicKey), fingerprint)

          yield* signAndVerify(key)
          for (const algorithm of SshKey.signatureAlgorithms(type)) {
            assert.isTrue(yield* SshKey.verify(publicKey, data, yield* key.sign(data, algorithm)))
          }
        }))
    }

    it.effect("accepts UTF-8 bytes", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.parsePrivateKey(utf8(fixture("openssh_ed25519")))
        assert.strictEqual(key.type, "ssh-ed25519")
        assert.strictEqual(key.publicKey.comment, "ed25519@fixture")
      }))

    it.effect("accepts PEM blocks surrounded by other text", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.parsePrivateKey(`leading text\n${fixture("pkcs8_ecdsa256")}\ntrailing text\n`)
        assert.strictEqual(key.type, "ecdsa-sha2-nistp256")
      }))

    it.effect("accepts CRLF line endings", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.parsePrivateKey(fixture("openssh_rsa").replace(/\n/g, "\r\n"))
        assert.strictEqual(key.type, "ssh-rsa")
        assert.strictEqual(key.publicKey.comment, "rsa@fixture")
      }))

    it.effect("options.comment overrides the comment", () =>
      Effect.gen(function*() {
        const openssh = yield* SshKey.parsePrivateKey(fixture("openssh_ed25519"), { comment: "override" })
        assert.strictEqual(openssh.publicKey.comment, "override")
        assert.strictEqual(openssh.type, "ssh-ed25519")
        assert.isTrue(SshKey.isPrivateKey(openssh))

        const pkcs8 = yield* SshKey.parsePrivateKey(fixture("pkcs8_rsa"), { comment: "pkcs8 comment" })
        assert.strictEqual(pkcs8.publicKey.comment, "pkcs8 comment")

        const empty = yield* SshKey.parsePrivateKey(fixture("openssh_rsa"), { comment: "" })
        assert.strictEqual(empty.publicKey.comment, "")

        // the override keeps the key material and signing capability
        const original = yield* SshKey.parsePrivateKey(fixture("openssh_ed25519"))
        assert.isTrue(SshKey.equals(openssh.publicKey, original.publicKey))
        yield* signAndVerify(openssh)
        yield* signAndVerify(pkcs8)
      }))

    it.effect("fails for passphrase-protected OpenSSH keys", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(SshKey.parsePrivateKey(fixture("encrypted_ed25519")))
        assertKeyError(error, "encrypted")
        assert.include(error.message, "OpenSSH")
      }))

    it.effect("fails for passphrase-protected PEM keys", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(SshKey.parsePrivateKey(fixture("encrypted_pem_rsa")))
        assertKeyError(error, "SSH key error")
        // Without the blank line after the BEGIN marker the encryption headers are detected.
        const compact = fixture("encrypted_pem_rsa").replace(
          "-----BEGIN RSA PRIVATE KEY-----\n",
          "-----BEGIN RSA PRIVATE KEY-----"
        )
        assertKeyError(
          yield* Effect.flip(SshKey.parsePrivateKey(compact)),
          "encrypted PEM private keys are not supported"
        )
      }))

    it.effect("reports encryption for passphrase-protected PEM keys written by ssh-keygen", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(SshKey.parsePrivateKey(fixture("encrypted_pem_rsa")))
        assertKeyError(error, "encrypted")
      }))

    it.effect("fails for passphrase-protected PKCS#8 keys", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(SshKey.parsePrivateKey(fixture("encrypted_pkcs8_ecdsa256")))
        assertKeyError(error, "encrypted")
        assert.include(error.message, "PKCS#8")
      }))

    it.effect("fails for input without a PEM block", () =>
      Effect.gen(function*() {
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey("not a private key")), "could not parse private key")
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey("")), "could not parse private key")
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(new Uint8Array([0xff, 0, 1]))), "could not parse")
        // a public key is not a private key
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(fixture("openssh_ed25519.pub"))), "could not parse")
      }))

    it.effect("fails for unsupported PEM blocks", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(
          SshKey.parsePrivateKey("-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n")
        )
        assertKeyError(error, "unsupported PEM block CERTIFICATE")
      }))

    it.effect("fails for corrupt key material", () =>
      Effect.gen(function*() {
        const pem = (label: string, body: string) => `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
        const garbage = "Z2FyYmFnZSBrZXkgbWF0ZXJpYWw="
        for (const label of ["OPENSSH PRIVATE KEY", "PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY"]) {
          assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(pem(label, garbage))), "SSH key error")
        }
        assertKeyError(
          yield* Effect.flip(SshKey.parsePrivateKey(pem("OPENSSH PRIVATE KEY", "!!!not base64!!!"))),
          "could not parse private key"
        )

        // a truncated OpenSSH key
        const lines = fixture("openssh_ed25519").trim().split("\n")
        const truncated = [lines[0], ...lines.slice(1, 3), lines[lines.length - 1]].join("\n")
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(truncated)), "could not parse private key")
      }))

    it.effect("fails for OpenSSH keys with mismatched check bytes", () =>
      Effect.gen(function*() {
        const section = new Writer().uint32(1).uint32(2).string("ssh-ed25519").finish()
        const body = new Writer()
          .raw(utf8("openssh-key-v1\0"))
          .string("none")
          .string("none")
          .string("")
          .uint32(1)
          .string(new Uint8Array(0))
          .string(section)
          .finish()
        const text = `-----BEGIN OPENSSH PRIVATE KEY-----\n${Base64.encode(body)}\n-----END OPENSSH PRIVATE KEY-----\n`
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(text)), "could not parse private key")
      }))

    it.effect("fails for unsupported OpenSSH key types", () =>
      Effect.gen(function*() {
        const section = new Writer().uint32(7).uint32(7).string("ssh-dss").finish()
        const body = new Writer()
          .raw(utf8("openssh-key-v1\0"))
          .string("none")
          .string("none")
          .string("")
          .uint32(1)
          .string(new Uint8Array(0))
          .string(section)
          .finish()
        const text = `-----BEGIN OPENSSH PRIVATE KEY-----\n${Base64.encode(body)}\n-----END OPENSSH PRIVATE KEY-----\n`
        assertKeyError(yield* Effect.flip(SshKey.parsePrivateKey(text)), "unsupported key type ssh-dss")
      }))
  })

  describe("public keys", () => {
    it("parsePublicKey / formatPublicKey round trip", () => {
      for (const { comment, name, type } of privateKeyFixtures) {
        const text = fixture(`${name}.pub`).trim()
        const key = parsePublicKeyUnsafe(text)
        assert.strictEqual(key.type, type)
        assert.strictEqual(key.comment, comment)
        assert.strictEqual(SshKey.formatPublicKey(key), text)
        assert.isTrue(SshKey.equals(parsePublicKeyUnsafe(SshKey.formatPublicKey(key)), key))
      }
    })

    it("parsePublicKey keeps multi-word comments", () => {
      const [type, base64] = fixture("openssh_ed25519.pub").trim().split(" ")
      const key = parsePublicKeyUnsafe(`${type} ${base64} user@host with spaces`)
      assert.strictEqual(key.comment, "user@host with spaces")
      assert.strictEqual(SshKey.formatPublicKey(key), `${type} ${base64} user@host with spaces`)
      assert.strictEqual(parsePublicKeyUnsafe(`  ${type}\t${base64}  `).comment, "")
    })

    it("parsePublicKey skips authorized_keys options", () => {
      const [type, base64] = fixture("openssh_ed25519.pub").trim().split(" ")
      const key = parsePublicKeyUnsafe(`no-pty,command="x" ${type} ${base64} comment`)
      assert.strictEqual(key.type, "ssh-ed25519")
      assert.strictEqual(key.comment, "comment")
      assert.strictEqual(SshKey.formatPublicKey(key), `${type} ${base64} comment`)

      const spaced = parsePublicKeyUnsafe(`from="10.0.0.1",command="echo hi there" ${type} ${base64}`)
      assert.strictEqual(spaced.type, "ssh-ed25519")
      assert.strictEqual(spaced.comment, "")
      assert.isTrue(SshKey.equals(key, spaced))

      const [rsaType, rsaBase64] = fixture("openssh_rsa.pub").trim().split(" ")
      const rsa = parsePublicKeyUnsafe(`restrict,port-forwarding ${rsaType} ${rsaBase64} rsa@fixture`)
      assert.strictEqual(rsa.type, "ssh-rsa")
      assert.strictEqual(rsa.comment, "rsa@fixture")
    })

    it("parsePublicKey fails without a public key", () => {
      const [type, base64] = fixture("openssh_ed25519.pub").trim().split(" ")
      const failures = [
        "",
        "ssh-ed25519",
        "ssh-ed25519 !!!notbase64!!!",
        `ssh-rsa ${base64}`, // the blob encodes a different key type
        type
      ]
      for (const text of failures) {
        const result = SshKey.parsePublicKey(text)
        assert.isTrue(Result.isFailure(result), text)
        if (Result.isFailure(result)) assertKeyError(result.failure, "no public key found")
      }
    })

    it("formatPublicKey omits an empty comment", () => {
      const key = parsePublicKeyUnsafe(fixture("pkcs8_ed25519.pub"))
      assert.strictEqual(SshKey.formatPublicKey(key), fixture("pkcs8_ed25519.pub").trim())
      assert.isFalse(SshKey.formatPublicKey(key).endsWith(" "))
    })

    it("fromBlob", () => {
      const blob = new Writer().string("ssh-ed25519").string(new Uint8Array(32)).finish()
      const key = SshKey.fromBlob(blob, "comment")
      assert.isTrue(Result.isSuccess(key))
      if (Result.isSuccess(key)) {
        assert.strictEqual(key.success.type, "ssh-ed25519")
        assert.strictEqual(key.success.comment, "comment")
        assert.deepStrictEqual(key.success.blob, blob)
        assert.isTrue(SshKey.isPublicKey(key.success))
        assert.isFalse(SshKey.isPrivateKey(key.success))
        // the blob is copied
        blob[blob.length - 1] = 1
        assert.strictEqual(key.success.blob[key.success.blob.length - 1], 0)
        assert.deepStrictEqual(key.success.toJSON(), { _id: "PublicKey", type: "ssh-ed25519", comment: "comment" })
      }
      const noComment = SshKey.fromBlob(new Writer().string("sk-ssh-ed25519@openssh.com").finish())
      assert.isTrue(Result.isSuccess(noComment))
      if (Result.isSuccess(noComment)) {
        assert.strictEqual(noComment.success.type, "sk-ssh-ed25519@openssh.com")
        assert.strictEqual(noComment.success.comment, "")
      }
    })

    it("fromBlob fails for invalid blobs", () => {
      const cases: ReadonlyArray<[Uint8Array, string]> = [
        [new Uint8Array(0), "invalid public key blob"],
        [new Uint8Array([0, 0]), "invalid public key blob"],
        [new Uint8Array([0, 0, 0, 10, 0x73, 0x73]), "invalid public key blob"],
        [new Uint8Array([0, 0, 0, 0]), "empty key type"]
      ]
      for (const [blob, message] of cases) {
        const result = SshKey.fromBlob(blob)
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) assertKeyError(result.failure, message)
      }
    })

    it("equals compares blobs and ignores comments", () => {
      const a = parsePublicKeyUnsafe(fixture("openssh_ed25519.pub"))
      const b = parsePublicKeyUnsafe(fixture("openssh_ed25519.pub").replace("ed25519@fixture", "other"))
      const c = parsePublicKeyUnsafe(fixture("pkcs8_ed25519.pub"))
      const d = parsePublicKeyUnsafe(fixture("openssh_rsa.pub"))
      assert.isTrue(SshKey.equals(a, a))
      assert.isTrue(SshKey.equals(a, b))
      assert.isFalse(SshKey.equals(a, c))
      assert.isFalse(SshKey.equals(a, d))
      assert.isFalse(SshKey.equals(d, a))
    })

    it("guards", () => {
      assert.isFalse(SshKey.isPublicKey(null))
      assert.isFalse(SshKey.isPublicKey({ type: "ssh-ed25519" }))
      assert.isFalse(SshKey.isPrivateKey(undefined))
      assert.isFalse(SshKey.isPrivateKey(parsePublicKeyUnsafe(fixture("openssh_ed25519.pub"))))
    })
  })

  describe("signatureAlgorithms", () => {
    it("lists the algorithms for each key type in preference order", () => {
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ssh-rsa"), ["rsa-sha2-512", "rsa-sha2-256"])
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ssh-ed25519"), ["ssh-ed25519"])
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ecdsa-sha2-nistp256"), ["ecdsa-sha2-nistp256"])
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ecdsa-sha2-nistp384"), ["ecdsa-sha2-nistp384"])
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ecdsa-sha2-nistp521"), ["ecdsa-sha2-nistp521"])
    })

    it("returns no algorithms for unsupported key types", () => {
      assert.deepStrictEqual(SshKey.signatureAlgorithms("ssh-dss"), [])
      assert.deepStrictEqual(SshKey.signatureAlgorithms("sk-ssh-ed25519@openssh.com"), [])
      assert.deepStrictEqual(SshKey.signatureAlgorithms(""), [])
    })
  })

  describe("sign / verify", () => {
    it.effect("RSA keys sign with rsa-sha2-256 and rsa-sha2-512", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.parsePrivateKey(fixture("openssh_rsa"))
        const sha256 = yield* key.sign(data, "rsa-sha2-256")
        const sha512 = yield* key.sign(data, "rsa-sha2-512")
        assert.strictEqual(signatureAlgorithm(sha256), "rsa-sha2-256")
        assert.strictEqual(signatureAlgorithm(sha512), "rsa-sha2-512")
        // 2048 bit modulus
        const reader = new Reader(sha256)
        reader.string()
        assert.strictEqual(reader.string().length, 256)
        assert.isTrue(yield* SshKey.verify(key.publicKey, data, sha256))
        assert.isTrue(yield* SshKey.verify(key.publicKey, data, sha512))
        // a signature labelled with the other hash does not verify
        const relabelled = new Writer().string("rsa-sha2-512").string(new Reader(sha256, 4 + 12).string()).finish()
        assert.isFalse(yield* SshKey.verify(key.publicKey, data, relabelled))
      }))

    it.effect("ed25519 and ECDSA signatures are well formed", () =>
      Effect.gen(function*() {
        const ed25519 = yield* SshKey.parsePrivateKey(fixture("openssh_ed25519"))
        const signature = new Reader(yield* ed25519.sign(data, "ssh-ed25519"))
        assert.strictEqual(signature.utf8(), "ssh-ed25519")
        assert.strictEqual(signature.string().length, 64)
        assert.strictEqual(signature.remaining, 0)

        const ecdsa = yield* SshKey.parsePrivateKey(fixture("openssh_ecdsa521"))
        const ecdsaSignature = new Reader(yield* ecdsa.sign(data, "ecdsa-sha2-nistp521"))
        assert.strictEqual(ecdsaSignature.utf8(), "ecdsa-sha2-nistp521")
        const inner = new Reader(ecdsaSignature.string())
        assert.isAtMost(inner.mpint().length, 66)
        assert.isAtMost(inner.mpint().length, 66)
        assert.strictEqual(inner.remaining, 0)
      }))

    it.effect("signs empty data", () =>
      Effect.gen(function*() {
        for (const name of ["openssh_ed25519", "openssh_ecdsa256", "openssh_rsa"]) {
          const key = yield* SshKey.parsePrivateKey(fixture(name))
          const algorithm = SshKey.signatureAlgorithms(key.type)[0]
          const signature = yield* key.sign(new Uint8Array(0), algorithm)
          assert.isTrue(yield* SshKey.verify(key.publicKey, new Uint8Array(0), signature))
          assert.isFalse(yield* SshKey.verify(key.publicKey, data, signature))
        }
      }))

    it.effect("verify returns false for a signature by another key", () =>
      Effect.gen(function*() {
        const pairs: ReadonlyArray<[string, string]> = [
          ["openssh_ed25519", "pkcs8_ed25519"],
          ["openssh_ecdsa256", "pkcs8_ecdsa256"],
          ["openssh_rsa", "pkcs8_rsa"]
        ]
        for (const [signerName, otherName] of pairs) {
          const signer = yield* SshKey.parsePrivateKey(fixture(signerName))
          const other = yield* SshKey.parsePrivateKey(fixture(otherName))
          const signature = yield* signer.sign(data, SshKey.signatureAlgorithms(signer.type)[0])
          assert.isFalse(yield* SshKey.verify(other.publicKey, data, signature))
        }
      }))

    it.effect("sign fails for unsupported algorithms", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<[string, string]> = [
          ["openssh_ed25519", "rsa-sha2-256"],
          ["openssh_ecdsa256", "ecdsa-sha2-nistp384"],
          ["openssh_rsa", "ssh-rsa"],
          ["openssh_rsa", "ssh-ed25519"]
        ]
        for (const [name, algorithm] of cases) {
          const key = yield* SshKey.parsePrivateKey(fixture(name))
          assertKeyError(yield* Effect.flip(key.sign(data, algorithm)), `unsupported signature algorithm ${algorithm}`)
        }
      }))

    it.effect("verify fails for undecodable signatures and mismatched algorithms", () =>
      Effect.gen(function*() {
        const ed25519 = yield* SshKey.parsePrivateKey(fixture("openssh_ed25519"))
        const rsa = yield* SshKey.parsePrivateKey(fixture("openssh_rsa"))
        const rsaSignature = yield* rsa.sign(data, "rsa-sha2-256")
        assertKeyError(
          yield* Effect.flip(SshKey.verify(ed25519.publicKey, data, rsaSignature)),
          "could not verify signature"
        )
        assertKeyError(
          yield* Effect.flip(SshKey.verify(ed25519.publicKey, data, new Uint8Array([0, 0, 0, 9, 1]))),
          "could not verify signature"
        )
        const unsupported = parsePublicKeyUnsafe(
          `ssh-dss ${Base64.encode(new Writer().string("ssh-dss").finish())}`
        )
        assertKeyError(
          yield* Effect.flip(
            SshKey.verify(unsupported, data, new Writer().string("ssh-dss").string(new Uint8Array(40)).finish())
          ),
          "could not verify signature"
        )
      }))
  })

  describe("generate", () => {
    for (const type of allKeyTypes) {
      it.effect(`generates ${type} keys`, () =>
        Effect.gen(function*() {
          const key = yield* SshKey.generate(type, { comment: `${type}@generated`, bits: 2048 })
          assert.isTrue(SshKey.isPrivateKey(key))
          assert.strictEqual(key.type, type)
          assert.strictEqual(key.publicKey.type, type)
          assert.strictEqual(key.publicKey.comment, `${type}@generated`)
          assert.deepStrictEqual(key.toJSON(), { _id: "PrivateKey", type, comment: `${type}@generated` })
          assert.match(yield* SshKey.fingerprint(key.publicKey), /^SHA256:[A-Za-z0-9+/]{43}$/)

          // the public key survives a text round trip
          const text = SshKey.formatPublicKey(key.publicKey)
          assert.isTrue(text.startsWith(`${type} `))
          assert.isTrue(text.endsWith(` ${type}@generated`))
          const parsed = parsePublicKeyUnsafe(text)
          assert.isTrue(SshKey.equals(parsed, key.publicKey))
          assert.strictEqual(yield* SshKey.fingerprint(parsed), yield* SshKey.fingerprint(key.publicKey))

          yield* signAndVerify(key)
          for (const algorithm of SshKey.signatureAlgorithms(type)) {
            assert.isTrue(yield* SshKey.verify(parsed, data, yield* key.sign(data, algorithm)))
          }

          // keys are fresh
          const other = yield* SshKey.generate(type, { bits: 2048 })
          assert.isFalse(SshKey.equals(other.publicKey, key.publicKey))
          assert.strictEqual(other.publicKey.comment, "")
        }))
    }

    it.effect("honours bits for RSA", () =>
      Effect.gen(function*() {
        const key = yield* SshKey.generate("ssh-rsa", { bits: 2048 })
        const signature = new Reader(yield* key.sign(data, "rsa-sha2-512"))
        signature.string()
        assert.strictEqual(signature.string().length, 256)
        const reader = new Reader(key.publicKey.blob)
        assert.strictEqual(reader.utf8(), "ssh-rsa")
        assert.deepStrictEqual(Array.from(reader.mpint()), [1, 0, 1])
        assert.strictEqual(reader.mpint().length, 256)
      }))

    it.effect("fails for invalid options", () =>
      Effect.gen(function*() {
        assertKeyError(yield* Effect.flip(SshKey.generate("ssh-rsa", { bits: 7 })), "could not generate ssh-rsa key")
      }))
  })
})
