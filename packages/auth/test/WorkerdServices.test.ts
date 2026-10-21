import * as Password from "@effect/auth/Password"
import * as WorkerdServices from "@effect/auth/WorkerdServices"
import { assert, describe, it } from "@effect/vitest"
import * as CryptoError from "effect/crypto/CryptoError"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Hex from "effect/encoding/Hex"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import { vi } from "vitest"

// Vitest requires a direct vi import to hoist this WASM module mock.
// Node's test loader cannot statically import WASM like Wrangler. Exercise the
// actual shipped module and all real services after replacing only that import.
vi.mock("effect/crypto/argon2.wasm", async () => {
  const { readFileSync } = await import("node:fs")
  return {
    default: new WebAssembly.Module(
      readFileSync(new URL("../../effect/src/crypto/argon2.wasm", import.meta.url))
    )
  }
})

const password = Redacted.make("workerd integration password")

const hashArgon2 = Password.PasswordHashing.use((hashing) => hashing.hash(password)).pipe(
  Effect.provide(WorkerdServices.layer)
)

describe("WorkerdServices", { concurrent: false }, () => {
  it.effect("constructs the default services and hashes with WASM Argon2id", () =>
    Effect.gen(function*() {
      const hashing = yield* Password.PasswordHashing
      const random = yield* SecureRandom.SecureRandom
      const http = yield* HttpClient.HttpClient
      assert.isFunction(http.get)
      assert.strictEqual((yield* random.randomBytes(16)).length, 16)

      const encoded = yield* hashing.hash(password)
      assert.isTrue(Redacted.value(encoded).startsWith("$argon2id$v=19$m=19456,t=2,p=1$"))
      assert.deepStrictEqual(yield* hashing.verify(password, encoded), { matches: true, needsRehash: false })
      assert.deepStrictEqual(yield* hashing.verify(Redacted.make("wrong password"), encoded), {
        matches: false,
        needsRehash: false
      })

      // The default composition retains native scrypt for existing verifiers.
      const kdf = yield* Kdf.Kdf
      const output = yield* kdf.derive(Kdf.scrypt({ cost: 16, blockSize: 1, parallelism: 1 }), new Uint8Array(), {
        salt: new Uint8Array(),
        length: 64
      })
      assert.strictEqual(
        Hex.encode(output),
        "77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906"
      )
    }).pipe(Effect.provide(WorkerdServices.layer)))

  it.effect("supports native-scrypt password policy and verification across both modes", () =>
    Effect.gen(function*() {
      const argon2 = yield* hashArgon2
      const scrypt = yield* Effect.gen(function*() {
        const hashing = yield* Password.PasswordHashing
        assert.deepStrictEqual(yield* hashing.verify(password, argon2), { matches: true, needsRehash: true })
        const encoded = yield* hashing.hash(password)
        assert.isTrue(Redacted.value(encoded).startsWith("$scrypt$ln=14,r=8,p=5$"))
        assert.deepStrictEqual(yield* hashing.verify(password, encoded), { matches: true, needsRehash: false })
        return encoded
      }).pipe(Effect.provide(WorkerdServices.layerWith({
        passwordHashing: Password.defaultScryptPasswordHashingConfig
      })))
      const verified = yield* Password.PasswordHashing.use((hashing) => hashing.verify(password, scrypt)).pipe(
        Effect.provide(WorkerdServices.layer)
      )
      assert.deepStrictEqual(verified, { matches: true, needsRehash: true })
    }))

  it.effect("raises KDF ceilings with the password policy", () =>
    Effect.gen(function*() {
      const hashing = yield* Password.PasswordHashing
      const encoded = yield* hashing.hash(password)
      assert.isTrue(Redacted.value(encoded).startsWith("$argon2id$v=19$m=65536,t=3,p=1$"))
      assert.deepStrictEqual(yield* hashing.verify(password, encoded), { matches: true, needsRehash: false })
    }).pipe(Effect.provide(WorkerdServices.layerWith({
      passwordHashing: {
        ...Password.defaultPasswordHashingConfig,
        memoryKiB: 65_536,
        passes: 3,
        maximumMemoryPasses: 196_608
      }
    }))))

  it.effect("applies explicitly tighter KDF ceilings", () =>
    Effect.gen(function*() {
      const hashing = yield* Password.PasswordHashing
      const failure = yield* Effect.flip(hashing.hash(password))
      assert.strictEqual(failure._tag, "PasswordHashingUnavailable")
      const kdf = yield* Kdf.Kdf
      const invalid = yield* Effect.flip(
        kdf.derive(Kdf.argon2id({ memory: 19_456, passes: 2, parallelism: 1 }), new Uint8Array(), {
          salt: new Uint8Array(16),
          length: 32
        })
      )
      assert.strictEqual(invalid.reason._tag, "InvalidArgument")
    }).pipe(Effect.provide(WorkerdServices.layerWith({ kdfLimits: { maximumMemoryKiB: 8192 } }))))

  it.effect("shares bounded admission with password preparation and releases expired waiters", () =>
    Effect.gen(function*() {
      const hashing = yield* Password.PasswordHashing
      const admission = yield* KdfAdmission.KdfAdmission
      const entered = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      const active = yield* admission.run(
        Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(finish))
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered)
      const queued = yield* hashing.hash(password).pipe(Effect.flip, Effect.forkChild)
      yield* TestClock.adjust(1)

      const erased = Redacted.make("must not be read before admission")
      Redacted.wipeUnsafe(erased)
      assert.strictEqual((yield* Effect.flip(hashing.hash(erased)))._tag, "PasswordKdfBusy")
      yield* TestClock.adjust(100)
      assert.strictEqual((yield* Fiber.join(queued))._tag, "PasswordKdfBusy")
      yield* Deferred.succeed(finish, undefined)
      yield* Fiber.join(active)
      assert.isTrue(Redacted.value(yield* hashing.hash(password)).startsWith("$argon2id$"))
    }).pipe(Effect.provide(WorkerdServices.layerWith({
      kdfAdmission: { concurrency: 1, maxQueued: 1, maxWaitMilliseconds: 100 }
    }))))

  it.effect("shares admission with direct KDF calls and reports the Busy crypto reason", () =>
    Effect.gen(function*() {
      const kdf = yield* Kdf.Kdf
      const admission = yield* KdfAdmission.KdfAdmission
      const entered = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      const active = yield* admission.run(
        Effect.andThen(Deferred.succeed(entered, undefined), Deferred.await(finish))
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered)

      const derive = kdf.derive(Kdf.scrypt({ cost: 16, blockSize: 1, parallelism: 1 }), new Uint8Array(), {
        salt: new Uint8Array(),
        length: 64
      })
      const failure = yield* Effect.flip(derive)
      assert.isTrue(CryptoError.isCryptoError(failure))
      assert.strictEqual(failure.module, "Kdf")
      assert.strictEqual(failure.method, "derive")
      assert.strictEqual(failure.reason._tag, "Busy")

      yield* Deferred.succeed(finish, undefined)
      yield* Fiber.join(active)
      assert.strictEqual(
        Hex.encode(yield* derive),
        "77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906"
      )
    }).pipe(Effect.provide(WorkerdServices.layerWith({
      kdfAdmission: { concurrency: 1, maxQueued: 0 }
    }))))

  it.effect("rejects invalid configuration while building the convenience layer", () =>
    Effect.gen(function*() {
      const limits = yield* Effect.flip(Layer.build(WorkerdServices.layerWith({
        kdfLimits: { maximumMemoryKiB: 0 }
      })))
      assert.strictEqual(limits._tag, "CryptoError")
      const admission = yield* Effect.flip(Layer.build(WorkerdServices.layerWith({
        kdfAdmission: { concurrency: 0 }
      })))
      assert.strictEqual(admission._tag, "CryptoError")
    }))
})
