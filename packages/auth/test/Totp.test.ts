import { codeAt } from "@effect/auth/internal/totp/cryptography"
import { TotpSecretBinding, TotpSecretEnvelope } from "@effect/auth/internal/totp/models"
import { TotpCryptography } from "@effect/auth/internal/totp/totpCryptography"
import { TotpSecretKeys } from "@effect/auth/internal/totp/totpSecretKeys"
import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber, Layer, Redacted, Schema } from "effect"
import { Aead, Digest, Mac, SecureRandom } from "effect/crypto"
import { Base64Url } from "effect/encoding"
import { TestClock } from "effect/testing"

const key = Redacted.make(new Uint8Array(32).fill(7))
const keys = Layer.succeed(TotpSecretKeys, {
  current: Effect.succeed({ keyId: "key1", key }),
  get: () => Effect.succeed(key)
})
const crypto = Layer.mergeAll(Aead.layerWebCrypto, Digest.layerWebCrypto, Mac.layerWebCrypto).pipe(
  Layer.provideMerge(SecureRandom.layerWebCrypto)
)
const layer = TotpCryptography.layer.pipe(Layer.provide(Layer.merge(keys, crypto)))
const binding = Schema.decodeSync(TotpSecretBinding)({
  moduleId: "totp",
  subjectId: "subject",
  credentialId: "credential",
  revision: "rev1"
})
const envelope = Schema.decodeSync(TotpSecretEnvelope)({
  keyId: "key1",
  revision: "rev1",
  nonce: "AwMDAwMDAwMDAwMD",
  ciphertext: "FMyQN28eaXpDcHJu2GPKOtoE2d8AdUKKUueXVvwh9CDEPWtn"
})

// Generated before migration using Node crypto. This proves stored envelopes and
// recovery digests remain readable after replacing the legacy crypto services.
describe("native TOTP cryptography", () => {
  it.effect("preserves stored AES-GCM, recovery digest, and RFC 6238 formats", () =>
    Effect.gen(function*() {
      const totp = yield* TotpCryptography
      const secret = yield* totp.decryptSecret(binding, envelope)
      assert.strictEqual(Base64Url.encode(secret), "MTIzNDU2Nzg5MDEyMzQ1Njc4OTA")
      assert.strictEqual(yield* totp.matchCode(secret, "287082", 59000, 0), 1)
      assert.strictEqual(yield* totp.matchCode(secret, "287082", 89000, 1), 1)
      assert.strictEqual(yield* totp.matchCode(secret, "000000", 59000, 1), null)
      assert.strictEqual(
        yield* totp.recoveryDigest("totp", "subject", "rc1-00112233-44556677-8899AABB-CCDDEEFF"),
        "YDZEBf4XTEdCk6fNZkWduCE6N9HQTvGXGB7Trn-QEEs"
      )
      const sealed = yield* totp.encryptSecret(binding, secret)
      assert.deepStrictEqual(yield* totp.decryptSecret(binding, sealed), secret)
      const wrongBinding = yield* totp.decryptSecret({ ...binding, credentialId: "other" }, envelope).pipe(
        Effect.result
      )
      assert.strictEqual(wrongBinding._tag, "Failure")
      if (wrongBinding._tag === "Failure") assert.strictEqual(wrongBinding.failure._tag, "TotpUnavailable")
      const wrongRevision = yield* totp.decryptSecret({ ...binding, revision: "rev2" }, envelope).pipe(Effect.result)
      assert.strictEqual(wrongRevision._tag, "Failure")
      const codes = yield* totp.newRecoveryCodes("totp", "subject")
      assert.strictEqual(new Set(codes.codes).size, 10)
      for (const [index, code] of codes.codes.entries()) {
        assert.match(code, /^rc1-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/)
        assert.strictEqual(codes.digests[index], yield* totp.recoveryDigest("totp", "subject", code))
      }
      secret.fill(0)
    }).pipe(Effect.provide(layer)))

  it.effect("implements all RFC 6238 SHA-1 eight-digit vectors", () =>
    Effect.gen(function*() {
      const secret = new TextEncoder().encode("12345678901234567890")
      for (
        const [time, code] of [
          [59, "94287082"],
          [1111111109, "07081804"],
          [1111111111, "14050471"],
          [1234567890, "89005924"],
          [2000000000, "69279037"],
          [20000000000, "65353130"]
        ] as const
      ) {
        assert.strictEqual(yield* codeAt(secret, Math.floor(time / 30), 8), code)
      }
    }).pipe(Effect.provide(crypto)))

  it.effect("joins native signing before releasing the caller's secret", () =>
    Effect.gen(function*() {
      const mac = yield* Mac.Mac
      const entered = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      const services = yield* Layer.build(TotpCryptography.layer.pipe(
        Layer.provide(Layer.succeed(Mac.Mac, {
          ...mac,
          sign: (key, data) =>
            Deferred.succeed(entered, undefined).pipe(
              Effect.andThen(Deferred.await(finish)),
              Effect.andThen(mac.sign(key, data))
            )
        })),
        Layer.provide(Layer.merge(keys, crypto))
      ))
      const totp = Context.get(services, TotpCryptography)
      const secret = new TextEncoder().encode("12345678901234567890")
      let released = false
      const worker = yield* Effect.acquireUseRelease(
        Effect.succeed(secret),
        (secret) => totp.matchCode(secret, "287082", 59000, 0),
        (secret) =>
          Effect.sync(() => {
            secret.fill(0)
            released = true
          })
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered)
      const interrupted = yield* Fiber.interrupt(worker).pipe(Effect.forkChild)
      yield* TestClock.adjust(1)
      assert.isFalse(released)
      yield* Deferred.succeed(finish, undefined)
      yield* Fiber.join(interrupted)
      assert.isTrue(released)
      assert.isTrue(secret.every((byte) => byte === 0))
    }).pipe(Effect.provide(crypto)))

  it.effect("reports erased consumer keys as typed unavailability", () =>
    Effect.gen(function*() {
      const erased = Redacted.make(new Uint8Array(32))
      Redacted.wipeUnsafe(erased)
      const services = yield* Layer.build(
        TotpCryptography.layer.pipe(Layer.provide(Layer.merge(
          crypto,
          Layer.succeed(TotpSecretKeys, {
            current: Effect.succeed({ keyId: "key1", key: erased }),
            get: () => Effect.succeed(erased)
          })
        )))
      )
      const totp = Context.get(services, TotpCryptography)
      for (
        const operation of [
          totp.encryptSecret(binding, new Uint8Array(20)).pipe(Effect.asVoid),
          totp.decryptSecret(binding, envelope).pipe(Effect.asVoid)
        ]
      ) {
        const result = yield* Effect.exit(operation)
        assert.isTrue(Exit.isFailure(result))
        if (Exit.isFailure(result)) {
          assert.isTrue(
            result.cause.reasons.every((reason) => reason._tag === "Fail" && reason.error._tag === "TotpUnavailable")
          )
        }
      }
    }))
})
