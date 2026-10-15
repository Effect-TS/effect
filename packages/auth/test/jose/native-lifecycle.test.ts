import type { JoseError } from "@effect/auth"
import { Jwe, Jwk, Jws } from "@effect/auth/Jose"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Redacted, Scope } from "effect"
import { Aes, Hmac, type SecureRandom } from "effect/crypto"
import { withNativeGate } from "../utils/nativeGate.ts"
import { cryptoLayer, privateJwk, publicJwk, secretJwk, utf8 } from "./fixtures.ts"

describe("native operation lifecycle", { concurrent: false }, () => {
  for (
    const [operation, methods] of [
      ["public key encoding", ["importKey", "exportKey"]],
      ["private key encoding", ["importKey", "exportKey"]],
      ["verification", ["importKey", "verify"]],
      ["signing", ["importKey", "sign"]],
      ["HMAC signing", ["importKey", "sign"]],
      ["encryption", ["importKey", "encrypt"]],
      ["decryption", ["importKey", "decrypt"]],
      ["PKCS8 import", ["importKey", "exportKey"]],
      ["key generation", ["generateKey", "exportKey"]]
    ] as const
  ) {
    for (const method of methods) {
      for (const termination of ["caller interruption", "owner closure"] as const) {
        it.effect(`${termination} joins ${operation} during ${method}`, () =>
          Effect.gen(function*() {
            const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
            const signingKey = yield* Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
            const verificationKey = yield* Jwk.importPublic(publicJwk, "ES256")
            const token = yield* Jws.sign(Redacted.make(utf8("payload")), signingKey, { alg: "ES256" })
            const secret = yield* Jwk.importSecret(Redacted.make(secretJwk), "HS256")
            const encryptionKey = yield* Jwk.importSecret(Redacted.make(secretJwk), "dir")
            const encrypted = yield* Jwe.encrypt(Redacted.make(utf8("plaintext")), encryptionKey, {
              alg: "dir",
              enc: "A256GCM"
            })
            let published = false
            let finalized = false
            let work: Effect.Effect<
              unknown,
              JoseError.VerifyError | Jwe.JweError,
              Jws.Requirements | Aes.Aes | SecureRandom.SecureRandom
            >
            switch (operation) {
              case "public key encoding":
                work = Jwk.importPublic(publicJwk, "ES256")
                break
              case "private key encoding":
                work = Jwk.importPrivate(Redacted.make(privateJwk), "ES256")
                break
              case "verification":
                work = Jws.verify(token, verificationKey, { algorithms: ["ES256"] })
                break
              case "signing":
                work = Jws.sign(Redacted.make(utf8("payload")), signingKey, { alg: "ES256" })
                break
              case "HMAC signing":
                work = Jws.sign(Redacted.make(utf8("payload")), secret, { alg: "HS256" })
                break
              case "encryption":
                work = Jwe.encrypt(Redacted.make(utf8("plaintext")), encryptionKey, { alg: "dir", enc: "A256GCM" })
                break
              case "decryption":
                work = Jwe.decrypt(encrypted, encryptionKey)
                break
              case "PKCS8 import":
                work = Jwk.importPkcs8(signingKey.material, "ES256")
                break
              case "key generation":
                work = Jwk.generateKeyPair({ algorithm: "ES256" })
                break
            }

            yield* withNativeGate(method, (gate) =>
              Effect.gen(function*() {
                const active = yield* Effect.forkIn(
                  work.pipe(
                    Effect.tap(() =>
                      Effect.sync(() => {
                        published = true
                      })
                    ),
                    Effect.ensuring(Effect.sync(() => {
                      finalized = true
                    }))
                  ),
                  owner
                )
                yield* gate.entered
                const terminating = yield* Effect.forkChild(
                  termination === "owner closure" ? Scope.close(owner, Exit.void) : Fiber.interrupt(active),
                  { startImmediately: true }
                )
                yield* Effect.yieldNow
                assert.isFalse(gate.isSettled())
                assert.isUndefined(terminating.pollUnsafe())
                assert.isFalse(finalized)
                yield* gate.release
                yield* Fiber.join(terminating)
                assert.isTrue(gate.isSettled())
                assert.isTrue(finalized)
                assert.isFalse(published)
                const exit = yield* Fiber.await(active)
                assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
              }))
          }).pipe(Effect.provide(cryptoLayer)))
      }
    }
  }

  for (const algorithm of ["HMAC", "AES"] as const) {
    it.effect(`keeps owned ${algorithm} inputs alive until interrupted native work settles, then wipes them`, () =>
      Effect.gen(function*() {
        const owner = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
        const key = yield* Jwk.importSecret(Redacted.make(secretJwk), algorithm === "HMAC" ? "HS256" : "dir")
        const hmac = yield* Hmac.Hmac
        const aes = yield* Aes.Aes
        const plaintext = utf8("owned plaintext")
        const expected = plaintext.slice()
        let ownedKey: Uint8Array | undefined
        let ownedPlaintext: Uint8Array | undefined
        let finalized = false
        const operation: Effect.Effect<
          Redacted.Redacted<string>,
          Jwe.JweError,
          Jws.Requirements | Aes.Aes | SecureRandom.SecureRandom
        > = algorithm === "HMAC"
          ? Jws.sign(Redacted.make(plaintext), key, { alg: "HS256" })
          : Jwe.encrypt(Redacted.make(plaintext), key, { alg: "dir", enc: "A256GCM" })
        const work = operation.pipe(
          Effect.provideService(Hmac.Hmac, {
            ...hmac,
            compute(options) {
              ownedKey = Redacted.value(options.key)
              return hmac.compute(options)
            }
          }),
          Effect.provideService(Aes.Aes, {
            ...aes,
            encryptGcm(options) {
              ownedKey = Redacted.value(options.key)
              ownedPlaintext = options.data
              return aes.encryptGcm(options)
            }
          }),
          Effect.ensuring(Effect.sync(() => {
            finalized = true
          }))
        )
        yield* withNativeGate("importKey", (gate) =>
          Effect.gen(function*() {
            const active = yield* Effect.forkIn(work, owner)
            yield* gate.entered
            assert.isDefined(ownedKey)
            assert.notStrictEqual(ownedKey, Redacted.value(key.material))
            assert.deepStrictEqual(ownedKey, new Uint8Array(32).fill(7))
            Redacted.value(key.material).fill(11)
            plaintext.fill(0)
            assert.deepStrictEqual(ownedKey, new Uint8Array(32).fill(7))
            if (algorithm === "AES") assert.deepStrictEqual(ownedPlaintext, expected)
            const stopping = yield* Effect.forkChild(Fiber.interrupt(active), { startImmediately: true })
            yield* Effect.yieldNow
            assert.isFalse(finalized)
            assert.isUndefined(stopping.pollUnsafe())
            assert.deepStrictEqual(ownedKey, new Uint8Array(32).fill(7))
            yield* gate.release
            yield* Fiber.join(stopping)
            assert.isTrue(finalized)
            assert.isTrue(ownedKey?.every((byte) => byte === 0))
            if (algorithm === "AES") assert.isTrue(ownedPlaintext?.every((byte) => byte === 0))
            assert.deepStrictEqual(Redacted.value(key.material), new Uint8Array(32).fill(11))
          }))
      }).pipe(Effect.provide(cryptoLayer)))
  }
})
