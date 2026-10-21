import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import { assert, describe, it } from "@effect/vitest"
import * as Kdf from "effect/crypto/Kdf"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as NodeCryptoModule from "node:crypto"

const encode = (value: string) => new TextEncoder().encode(value)

describe("Node KDF", () => {
  // RFC 7914 section 12: https://www.rfc-editor.org/rfc/rfc7914.html#section-12
  // The IETF code component license is retained in effect/src/crypto/NOTICE.md.
  it.effect("derives the scrypt known answers", () =>
    Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      for (
        const [password, salt, cost, blockSize, parallelism, expected] of [
          [
            "",
            "",
            16,
            1,
            1,
            "77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906"
          ],
          [
            "password",
            "NaCl",
            1024,
            8,
            16,
            "fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b3731622eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640"
          ]
        ] as const
      ) {
        const input = encode(password)
        const result = yield* kdf.derive(Kdf.scrypt({ cost, blockSize, parallelism }), input, {
          salt: encode(salt),
          length: 64
        })
        assert.strictEqual(Hex.encode(result), expected)
        assert.deepStrictEqual(input, encode(password))
      }
    }).pipe(Effect.provide(NodeCrypto.layerKdf)))

  it.effect("rejects invalid scrypt parameters before entering the runtime", () =>
    Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      for (
        const algorithm of [
          Kdf.scrypt({ cost: 3 }),
          Kdf.scrypt({ cost: 0 }),
          Kdf.scrypt({ blockSize: 0 }),
          Kdf.scrypt({ parallelism: 0 }),
          Kdf.scrypt({ cost: 2 ** 16, blockSize: 1 }),
          Kdf.scrypt({ blockSize: 2 ** 29, parallelism: 2 })
        ]
      ) {
        const error = yield* Effect.flip(
          kdf.derive(algorithm, encode("password"), { salt: encode("salt"), length: 32 })
        )
        assert.strictEqual(error.reason._tag, "InvalidArgument")
      }
    }).pipe(Effect.provide(NodeCrypto.layerKdf)))

  it.effect("passes the Argon2 secret and associated data to the native backend", () =>
    Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      const work = kdf.derive(Kdf.argon2id({ memory: 32, passes: 3, parallelism: 4 }), new Uint8Array(32).fill(1), {
        salt: new Uint8Array(16).fill(2),
        secret: new Uint8Array(8).fill(3),
        associatedData: new Uint8Array(12).fill(4),
        length: 32
      })
      if (typeof NodeCryptoModule.argon2 !== "function") {
        assert.strictEqual((yield* Effect.flip(work)).reason._tag, "Unsupported")
      } else {
        assert.strictEqual(Hex.encode(yield* work), "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659")
      }
    }).pipe(Effect.provide(NodeCrypto.layerKdf)))
})
