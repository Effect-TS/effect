import { MysqlAuth } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as crypto from "node:crypto"

const hex = (value: Uint8Array): string => Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")

const success = <A, E>(result: Result.Result<A, E>): A => {
  assert.isTrue(Result.isSuccess(result), "expected a success")
  return (result as Result.Success<A, E>).success
}

const failure = <A, E>(result: Result.Result<A, E>): E => {
  assert.isTrue(Result.isFailure(result), "expected a failure")
  return (result as Result.Failure<A, E>).failure
}

/** The scramble used by every golden below: bytes 0x00 through 0x13. */
const scramble = new Uint8Array(Array.from({ length: 20 }, (_, index) => index))

describe("MysqlAuth", () => {
  describe("mysql_native_password", () => {
    it("matches the reference token", () => {
      const token = success(MysqlAuth.nativePassword({ password: "secret", scramble }))
      assert.strictEqual(hex(token), "21b3ff405f32cbe4aafff291396046ea29fa3a4d")
    })

    it("is always twenty bytes", () => {
      assert.strictEqual(success(MysqlAuth.nativePassword({ password: "a", scramble })).length, 20)
    })

    it("sends nothing for an empty password", () => {
      assert.strictEqual(success(MysqlAuth.nativePassword({ password: "", scramble })).length, 0)
    })

    it("changes with the scramble", () => {
      const other = new Uint8Array(scramble)
      other[19] ^= 0xff
      assert.notStrictEqual(
        hex(success(MysqlAuth.nativePassword({ password: "secret", scramble }))),
        hex(success(MysqlAuth.nativePassword({ password: "secret", scramble: other })))
      )
    })

    it("rejects a scramble of the wrong length", () => {
      const error = failure(MysqlAuth.nativePassword({ password: "secret", scramble: new Uint8Array(8) }))
      assert.strictEqual(error._tag, "MysqlAuthError")
    })
  })

  describe("caching_sha2_password", () => {
    it("matches the reference fast-auth token", () => {
      const token = success(MysqlAuth.cachingSha2Password({ password: "secret", scramble }))
      assert.strictEqual(hex(token), "6c84c617ec1f26456a02c42ed7cb02eca7d8511333f98bc9b31e5f68ce1665d5")
    })

    it("is always thirty-two bytes", () => {
      assert.strictEqual(success(MysqlAuth.cachingSha2Password({ password: "a", scramble })).length, 32)
    })

    it("sends nothing for an empty password", () => {
      assert.strictEqual(success(MysqlAuth.cachingSha2Password({ password: "", scramble })).length, 0)
    })

    it("NUL-terminates a cleartext password", () => {
      assert.strictEqual(hex(MysqlAuth.cleartextPassword("secret")), "73656372657400")
    })

    it("encrypts a password the server can recover", () => {
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      })
      const encrypted = success(MysqlAuth.encryptedPassword({
        password: "secret",
        scramble,
        publicKey
      }))
      const decrypted = crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1"
      }, encrypted)
      // The server undoes the XOR with the scramble it sent, then strips the NUL.
      assert.strictEqual(hex(new Uint8Array(decrypted)), "73646171617106")
    })

    it("fails on a malformed public key", () => {
      const error = failure(MysqlAuth.encryptedPassword({
        password: "secret",
        scramble,
        publicKey: "not a key"
      }))
      assert.strictEqual(error._tag, "MysqlAuthError")
    })
  })

  describe("respond", () => {
    const bytesOf = (reply: MysqlAuth.Reply) => hex(reply.bytes)

    it("dispatches on the plugin name", () => {
      assert.strictEqual(
        bytesOf(success(MysqlAuth.respond({
          plugin: "mysql_native_password",
          password: "secret",
          scramble,
          usingTls: false
        }))),
        hex(success(MysqlAuth.nativePassword({ password: "secret", scramble })))
      )
      assert.strictEqual(
        bytesOf(success(MysqlAuth.respond({
          plugin: "caching_sha2_password",
          password: "secret",
          scramble,
          usingTls: false
        }))),
        hex(success(MysqlAuth.cachingSha2Password({ password: "secret", scramble })))
      )
    })

    it("hands sha256_password the plain password over TLS", () => {
      const reply = success(MysqlAuth.respond({
        plugin: "sha256_password",
        password: "secret",
        scramble,
        usingTls: true
      }))
      assert.strictEqual(reply._tag, "Respond")
      assert.strictEqual(bytesOf(reply), "73656372657400")
    })

    it("asks sha256_password for a key on a plaintext socket", () => {
      const reply = success(MysqlAuth.respond({
        plugin: "sha256_password",
        password: "secret",
        scramble,
        usingTls: false
      }))
      assert.strictEqual(reply._tag, "RequestPublicKey")
      assert.strictEqual(bytesOf(reply), "01")
    })

    it("needs no key for sha256_password when there is no password", () => {
      const reply = success(MysqlAuth.respond({
        plugin: "sha256_password",
        password: "",
        scramble,
        usingTls: false
      }))
      assert.strictEqual(reply._tag, "Respond")
      assert.strictEqual(bytesOf(reply), "00")
    })

    it("sends mysql_clear_password only over TLS", () => {
      const reply = success(MysqlAuth.respond({
        plugin: "mysql_clear_password",
        password: "secret",
        scramble,
        usingTls: true
      }))
      assert.strictEqual(bytesOf(reply), "73656372657400")
    })

    it("refuses mysql_clear_password on a plaintext socket", () => {
      const error = failure(MysqlAuth.respond({
        plugin: "mysql_clear_password",
        password: "secret",
        scramble,
        usingTls: false
      }))
      assert.strictEqual(error._tag, "MysqlAuthError")
      assert.match(error.message, /requires TLS/)
    })

    it("rejects an unsupported plugin", () => {
      const error = failure(MysqlAuth.respond({
        plugin: "authentication_kerberos_client",
        password: "secret",
        scramble,
        usingTls: true
      }))
      assert.strictEqual(error._tag, "MysqlAuthError")
      assert.include(error.message, "authentication_kerberos_client")
    })
  })
})
