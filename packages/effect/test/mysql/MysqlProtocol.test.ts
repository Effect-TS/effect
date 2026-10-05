import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Auth from "effect/mysql/internal/auth"
import { serverError } from "effect/mysql/internal/errors"
import * as P from "effect/mysql/internal/protocol"
import { createHash } from "node:crypto"

describe("MySQL protocol", () => {
  it("binds only executable question marks and preserves data as hex literals", () => {
    const sql = "SELECT ?, '?', `?`, \"?\" -- ?\n, ? /* ? */ # ?\n"
    assert.strictEqual(
      P.interpolate(sql, ["'\\\0💚", 42]),
      "SELECT CONVERT(X'275c00f09f929a' USING utf8mb4), '?', `?`, \"?\" -- ?\n, 42 /* ? */ # ?\n"
    )
    assert.throws(() => P.interpolate("?", []))
    assert.throws(() => P.interpolate("SELECT 1", [1]))
    assert.throws(() => P.interpolate("?", [Infinity]))
  })
  it("uses 64-bit length prefixes for parameters larger than a physical packet", () => {
    const input = new Uint8Array(0x1000000)
    const encoded = P.lengthEncoded(input)
    const reader = new P.Reader(encoded)
    assert.strictEqual(reader.u8(), 254)
    assert.strictEqual(reader.u64(), BigInt(input.length))
    assert.strictEqual(reader.remaining, input.length)
  })
  it("decodes unsigned, signed and unsafe integers without precision loss", () => {
    const columns = [{ name: "signed", type: 8, flags: 0, charset: 63 }, {
      name: "unsigned",
      type: 8,
      flags: 32,
      charset: 63
    }]
    const bytes = new Uint8Array(18)
    const view = new DataView(bytes.buffer)
    view.setBigInt64(2, -9007199254740993n, true)
    view.setBigUint64(10, 18446744073709551615n, true)
    assert.deepStrictEqual(P.binaryRow(bytes, columns), ["-9007199254740993", "18446744073709551615"])
    assert.deepStrictEqual(
      P.textRow(P.concat(P.lengthEncoded(P.encoder.encode("9007199254740993")), Uint8Array.of(251)), columns),
      ["9007199254740993", null]
    )
  })
  it("rejects truncated binary data", () => {
    assert.throws(() => P.binaryRow(Uint8Array.of(0, 0, 1), [{ name: "id", type: 3, flags: 0, charset: 63 }]))
    assert.throws(() => new P.Reader(Uint8Array.of(254, 0)).len())
  })
  it("encodes binary parameter values with explicit types and null bitmap", () => {
    const packet = P.executePacket(42, [null, 2.5, true, Uint8Array.of(0, 255), "hello", 9007199254740993n])
    const reader = new P.Reader(packet)
    assert.strictEqual(reader.u8(), 23)
    assert.strictEqual(reader.u32(), 42)
    assert.strictEqual(reader.u8(), 0)
    assert.strictEqual(reader.u32(), 1)
    assert.strictEqual(reader.u8(), 1)
    assert.strictEqual(reader.u8(), 1)
    assert.deepStrictEqual(Array.from(reader.take(12)), [6, 0, 5, 0, 1, 0, 252, 0, 253, 0, 8, 128])
  })
  it("binds full signed and unsigned 64-bit integers without string conversion", () => {
    const packet = P.executePacket(1, [BigInt("-9223372036854775808"), BigInt("18446744073709551615")])
    const reader = new P.Reader(packet)
    reader.take(10)
    assert.strictEqual(reader.u8(), 0)
    assert.strictEqual(reader.u8(), 1)
    assert.deepStrictEqual(Array.from(reader.take(4)), [8, 0, 8, 128])
    assert.strictEqual(reader.u64(), BigInt("9223372036854775808"))
    assert.strictEqual(reader.u64(), BigInt("18446744073709551615"))
  })
  it("classifies server errors and keeps SQLSTATE", () => {
    for (
      const [code, tag] of [
        [1045, "AuthenticationError"],
        [1044, "AuthorizationError"],
        [1064, "SqlSyntaxError"],
        [1062, "UniqueViolation"],
        [1213, "DeadlockError"],
        [1205, "LockTimeoutError"],
        [3024, "StatementTimeoutError"]
      ] as const
    ) {
      const error = serverError(
        P.concat(
          Uint8Array.of(255, code & 255, code >>> 8),
          P.encoder.encode("#23000Duplicate entry for key 'users.email'")
        )
      )
      assert.strictEqual(error.reason._tag, tag)
      assert.deepStrictEqual(error.reason.cause, {
        errno: code,
        sqlState: "23000",
        message: "Duplicate entry for key 'users.email'"
      })
      if (error.reason._tag === "UniqueViolation") assert.strictEqual(error.reason.constraint, "users.email")
    }
  })
  for (const plugin of ["mysql_native_password", "caching_sha2_password"]) {
    it.effect(`authenticates ${plugin} against independent digest vectors`, () =>
      Effect.gen(function*() {
        const crypto = yield* Crypto.Crypto
        const salt = P.encoder.encode("12345678901234567890")
        const algorithm = plugin === "mysql_native_password" ? "sha1" : "sha256"
        const hash = (bytes: Uint8Array) => createHash(algorithm).update(bytes).digest()
        const first = hash(P.encoder.encode("secret"))
        const second = hash(first)
        const third = hash(plugin === "mysql_native_password" ? P.concat(salt, second) : P.concat(second, salt))
        const token = yield* Auth.token(crypto, plugin, "secret", salt)
        assert.deepStrictEqual(token, Uint8Array.from(first, (b, i) => b ^ third[i]))
        assert.deepStrictEqual(yield* Auth.token(crypto, plugin, "", salt), new Uint8Array(0))
      }).pipe(Effect.provide(NodeCrypto.layer)))
  }
})
