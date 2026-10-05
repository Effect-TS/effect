import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Auth from "effect/mysql/internal/auth"
import * as P from "effect/mysql/internal/protocol"
import * as MysqlConnection from "effect/mysql/MysqlConnection"
import * as PlatformError from "effect/PlatformError"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as Socket from "effect/socket/Socket"
import * as SocketConnector from "effect/socket/SocketConnector"
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto"

const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 })
const keyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString()
const keyDer = new Uint8Array(keyPair.publicKey.export({ type: "spki", format: "der" }))
const pkcs1Pem = keyPair.publicKey.export({ type: "pkcs1", format: "pem" }).toString()
const pkcs1Der = new Uint8Array(keyPair.publicKey.export({ type: "pkcs1", format: "der" }))
const salt = P.encoder.encode("12345678901234567890")
const password = "secret雪💚"
const capabilities = 0x1 | 0x4 | 0x8 | 0x200 | 0x800 | 0x2000 | 0x8000 | 0x20000 | 0x40000 | 0x80000 | 0x200000
const greeting = (plugin: string) =>
  P.concat(
    Uint8Array.of(10),
    P.encoder.encode("8.4.0\0"),
    P.u32(42),
    salt.subarray(0, 8),
    Uint8Array.of(
      0,
      capabilities & 255,
      (capabilities >>> 8) & 255,
      45,
      2,
      0,
      (capabilities >>> 16) & 255,
      capabilities >>> 24,
      21
    ),
    new Uint8Array(10),
    salt.subarray(8),
    Uint8Array.of(0),
    P.encoder.encode(plugin + "\0")
  )
const authFixture = (options: {
  readonly plugin: "caching_sha2_password" | "sha256_password" | "unsupported_plugin"
  readonly switchPlugin?: boolean
  readonly serverKey?: string | undefined
  readonly emptyPassword?: boolean
}) =>
  Effect.gen(function*() {
    const incoming = yield* Queue.unbounded<Uint8Array>()
    const writes: Array<Uint8Array> = []
    const events: Array<string> = []
    let tls = false
    let handshake = true
    let switched = false
    let needsFullAuth = false
    let closed = false
    let decrypted = false
    const reply = (bytes: Uint8Array, sequence: number) =>
      Queue.offer(incoming, P.frame(bytes, sequence)).pipe(Effect.asVoid)
    const write = (chunk: string | Uint8Array | Socket.CloseEvent) =>
      Effect.gen(function*() {
        if (Socket.isCloseEvent(chunk)) return
        const frame = typeof chunk === "string" ? P.encoder.encode(chunk) : chunk
        const sequence = frame[3] + 1
        const payload = frame.subarray(4)
        writes.push(payload.slice())
        events.push("write")
        if (payload.length === 32 && handshake) return
        let data = payload
        if (handshake) {
          const reader = new P.Reader(payload)
          const flags = reader.u32()
          reader.take(28)
          reader.nul()
          data = (flags & 0x200000) !== 0 ? reader.field()! : reader.take(reader.u8())
          handshake = false
          if (options.switchPlugin && !switched) {
            switched = true
            yield* reply(
              P.concat(Uint8Array.of(254), P.encoder.encode(options.plugin + "\0"), salt, Uint8Array.of(0)),
              sequence
            )
            return
          }
        }
        if (options.plugin === "caching_sha2_password" && !needsFullAuth) {
          needsFullAuth = true
          yield* reply(Uint8Array.of(1, 4), sequence)
          return
        }
        if (data.length === 1 && data[0] === (options.plugin === "sha256_password" ? 1 : 2)) {
          events.push("retrieve")
          yield* reply(P.concat(Uint8Array.of(1), P.encoder.encode((options.serverKey ?? keyPem) + "\0")), sequence)
          return
        }
        if (options.emptyPassword) assert.deepStrictEqual(data, Uint8Array.of(0))
        else if (tls) assert.strictEqual(P.decoder.decode(data), password + "\0")
        else {
          assert.strictEqual(data.length, 256)
          const plain = privateDecrypt({
            key: keyPair.privateKey,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha1"
          }, data)
          for (let i = 0; i < plain.length; i++) plain[i] ^= salt[i % salt.length]
          assert.strictEqual(P.decoder.decode(plain), password + "\0")
          decrypted = true
        }
        yield* reply(Uint8Array.of(0, 0, 0, 2, 0, 0, 0), sequence)
      })
    const connector: SocketConnector.SocketConnector["Service"]["connect"] = () =>
      Effect.gen(function*() {
        yield* reply(greeting(options.switchPlugin ? "mysql_native_password" : options.plugin), 0)
        return {
          pull: Effect.map(Queue.take(incoming), (bytes) => [bytes] as const),
          run: () => Effect.never,
          write,
          writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true }),
          upgrade: () =>
            Effect.sync(() => {
              tls = true
              events.push("upgrade")
            }),
          close: Effect.sync(() => {
            closed = true
          })
        }
      })
    return { connector, writes, events, decrypted: () => decrypted, closed: () => closed }
  })
const services = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(NodeCrypto.layer),
    Effect.provideService(SocketConnector.SocketConnector, { connect: () => Effect.die("Unexpected connector") })
  )

describe("MySQL RSA password authentication", () => {
  it("accepts SPKI and PKCS1 PEM and DER keys", () => {
    for (
      const key of [
        keyPem,
        keyDer,
        pkcs1Pem,
        pkcs1Der,
        P.encoder.encode(keyPem),
        keyPem + "\0",
        P.encoder.encode(keyPem + "\0")
      ]
    ) {
      assert.deepStrictEqual(Auth.publicKey(key), keyDer)
    }
  })
  it("rejects malformed, truncated, trailing and non-RSA public keys", () => {
    const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey.export({ type: "spki", format: "pem" })
      .toString()
    for (
      const key of [
        "not a key",
        "-----BEGIN PUBLIC KEY-----\n!!!\n-----END PUBLIC KEY-----",
        keyDer.subarray(0, keyDer.length - 1),
        P.concat(keyDer, Uint8Array.of(0)),
        Uint8Array.of(48, 128, 0, 0),
        ec
      ]
    ) {
      assert.throws(() => Auth.publicKey(key), /MySQL:/)
    }
  })
  for (const plugin of ["caching_sha2_password", "sha256_password"] as const) {
    it.effect(`uses a pinned RSA key for ${plugin} and sends independently decryptable OAEP SHA-1 ciphertext`, () =>
      services(Effect.gen(function*() {
        const server = yield* authFixture({ plugin })
        const connection = yield* MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          serverPublicKey: keyPem,
          allowPublicKeyRetrieval: true
        })
        assert.strictEqual(connection.isClosed(), false)
        assert.strictEqual(server.decrypted(), true)
        assert.strictEqual(server.events.includes("retrieve"), false)
        assert.strictEqual(server.writes.length, plugin === "sha256_password" ? 1 : 2)
      })))
    it.effect(`retrieves an RSA key for ${plugin} only when explicitly enabled`, () =>
      services(Effect.gen(function*() {
        const server = yield* authFixture({ plugin })
        yield* MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          allowPublicKeyRetrieval: true
        })
        assert.strictEqual(server.decrypted(), true)
        assert.strictEqual(server.events.filter((event) => event === "retrieve").length, 1)
      })))
    it.effect(`rejects ${plugin} RSA authentication without a pinned key or retrieval opt-in`, () =>
      services(Effect.gen(function*() {
        const server = yield* authFixture({ plugin })
        const error = yield* Effect.flip(
          MysqlConnection.make({ connector: server.connector, password: Redacted.make(password) })
        )
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.include(error.message, "serverPublicKey")
        assert.strictEqual(server.closed(), true)
        assert.strictEqual(server.events.includes("retrieve"), false)
        assert.strictEqual(server.writes.length, plugin === "sha256_password" ? 0 : 1)
      })))
    it.effect(`supports ${plugin} authentication switches`, () =>
      services(Effect.gen(function*() {
        const server = yield* authFixture({ plugin, switchPlugin: true })
        yield* MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          serverPublicKey: pkcs1Der
        })
        assert.strictEqual(server.decrypted(), true)
        assert.strictEqual(server.events.includes("retrieve"), false)
      })))
    it.effect(`allows ${plugin} empty passwords without trusting a server key`, () =>
      services(Effect.gen(function*() {
        const server = yield* authFixture({ plugin, emptyPassword: true })
        yield* MysqlConnection.make({ connector: server.connector })
        assert.strictEqual(server.events.includes("retrieve"), false)
        assert.strictEqual(server.decrypted(), false)
      })))
  }
  it.effect("sends sha256_password plaintext only after upgrading TLS", () =>
    services(Effect.gen(function*() {
      const server = yield* authFixture({ plugin: "sha256_password" })
      yield* MysqlConnection.make({ connector: server.connector, password: Redacted.make(password), ssl: true })
      assert.deepStrictEqual(server.events, ["write", "upgrade", "write"])
      assert.strictEqual(server.decrypted(), false)
    })))
  it.effect("rejects invalid server-supplied keys without sending the password", () =>
    services(Effect.gen(function*() {
      const server = yield* authFixture({ plugin: "caching_sha2_password", serverKey: "not an RSA key" })
      const error = yield* Effect.flip(
        MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          allowPublicKeyRetrieval: true
        })
      )
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(server.writes.length, 2)
      assert.strictEqual(server.closed(), true)
    })))
  it.effect("reports unsupported cryptography as an authentication failure", () =>
    services(Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const { rsaOaepEncrypt: _, ...withoutRsa } = crypto
      const server = yield* authFixture({ plugin: "caching_sha2_password" })
      const error = yield* Effect.flip(
        MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          serverPublicKey: keyDer
        }).pipe(Effect.provideService(Crypto.Crypto, withoutRsa))
      )
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.include(error.message, "does not support RSA-OAEP")
      assert.strictEqual(server.writes.length, 1)
    })))
  it.effect("rejects invalid pinned keys without falling back to retrieval", () =>
    services(Effect.gen(function*() {
      for (const key of ["not an RSA key", Uint8Array.of(48, 1, 0)]) {
        const server = yield* authFixture({ plugin: "caching_sha2_password" })
        const error = yield* Effect.flip(
          MysqlConnection.make({
            connector: server.connector,
            password: Redacted.make(password),
            serverPublicKey: key,
            allowPublicKeyRetrieval: true
          })
        )
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.strictEqual(server.events.includes("retrieve"), false)
        assert.strictEqual(server.writes.length, 1)
      }
    })))
  it.effect("classifies a provider RSA encryption error without sending credentials", () =>
    services(Effect.gen(function*() {
      const crypto = yield* Crypto.Crypto
      const cause = PlatformError.badArgument({
        module: "Crypto",
        method: "rsaOaepEncrypt",
        description: "Unavailable RSA implementation"
      })
      const server = yield* authFixture({ plugin: "sha256_password" })
      const error = yield* Effect.flip(
        MysqlConnection.make({
          connector: server.connector,
          password: Redacted.make(password),
          serverPublicKey: keyPem
        }).pipe(Effect.provideService(Crypto.Crypto, { ...crypto, rsaOaepEncrypt: () => Effect.fail(cause) }))
      )
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(error.reason.cause, cause)
      assert.strictEqual(server.writes.length, 0)
      assert.strictEqual(server.closed(), true)
    })))
  it.effect("rejects unsupported authentication plugins even with an empty password", () =>
    services(Effect.gen(function*() {
      const server = yield* authFixture({ plugin: "unsupported_plugin" })
      const error = yield* Effect.flip(MysqlConnection.make({ connector: server.connector }))
      assert.strictEqual(error.reason._tag, "AuthenticationError")
      assert.strictEqual(server.writes.length, 0)
    })))
})
