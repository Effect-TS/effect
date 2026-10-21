import * as Password from "@effect/auth/Password"
import * as Proofs from "@effect/auth/Proofs"
import { TokenDigest } from "@effect/auth/Schema"
import { assert, it, vi } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Redacted } from "effect"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as Mac from "effect/crypto/Mac"
import fixtures from "../fixtures/credentials.ts"
import { webCryptoLayer } from "../utils/crypto.ts"
import { withNativeGate } from "../utils/nativeGate.ts"

for (const algorithm of ["Argon2id", "Scrypt", "Pbkdf2"] as const) {
  for (const failure of ["throw", "die"] as const) {
    it.effect(`maps ${algorithm} ${failure} failures to password unavailability and wipes its inputs`, () =>
      Effect.gen(function*() {
        const inputs: Array<Uint8Array> = []
        const service = Kdf.Kdf.of({
          derive: (actual, password, { salt }) => {
            assert.strictEqual(actual._tag, algorithm)
            inputs.push(password, salt)
            const error = new Error("private-backend-details")
            if (failure === "throw") throw error
            return Effect.die(error)
          }
        })
        const hashing = yield* Password.PasswordHashing.pipe(
          Effect.provide(
            Password.PasswordHashing.layer(
              algorithm === "Scrypt" ? Password.defaultScryptPasswordHashingConfig : undefined
            ).pipe(
              Layer.provide(Layer.succeed(Kdf.Kdf, service)),
              Layer.provide(KdfAdmission.layer()),
              Layer.provide(webCryptoLayer)
            )
          )
        )
        const password = Redacted.make("test password")
        const operation = algorithm === "Pbkdf2"
          ? hashing.verify(password, Redacted.make(Password.EncodedPasswordHash.make(fixtures.password.pbkdf2)))
            .pipe(Effect.asVoid)
          : hashing.hash(password).pipe(Effect.asVoid)
        const error = yield* operation.pipe(Effect.flip)
        assert.strictEqual(error._tag, "PasswordHashingUnavailable")
        assert.notInclude(JSON.stringify(error), "private-backend-details")
        assert.lengthOf(inputs, 2)
        assert.isTrue(inputs.every((bytes) => bytes.every((byte) => byte === 0)))
      }))
  }
}

const binding = Proofs.IdentifierProofBinding.make({
  flowId: "flow",
  contextDigest: TokenDigest.make("binding"),
  identifier: { namespace: "email", value: "test@example.invalid" }
})
const keyring = {
  activeKeyId: "key",
  keys: [{ id: "key", material: Redacted.make(fixtures.totp.key) }]
}
const makeProof = (kind: "token" | "numeric") =>
  Proofs.makeProofCrypto(
    "crypto-errors",
    Proofs.ProofPurpose.make("sign-in"),
    kind === "token" ? { _tag: "Token" } : { _tag: "NumericCode", digits: 6 },
    keyring
  )
const secret = (kind: "token" | "numeric") => Redacted.make(kind === "token" ? "a".repeat(43) : "123456")

for (const kind of ["token", "numeric"] as const) {
  for (const failure of ["throw", "die"] as const) {
    it.effect(`maps ${kind} proof ${failure} failures to typed unavailability`, () =>
      Effect.gen(function*() {
        const digest = yield* Digest.Digest
        const mac = yield* Mac.Mac
        const unavailable = () => {
          const error = new Error("private-backend-details")
          if (failure === "throw") throw error
          return Effect.die(error)
        }
        const operation = Effect.gen(function*() {
          const proof = yield* makeProof(kind)
          return yield* proof.digest(Proofs.ProofId.make("proof"), binding, secret(kind), proof.activeKeyId)
        })
        const error = yield* operation.pipe(
          Effect.provideService(Digest.Digest, { ...digest, digest: unavailable }),
          Effect.provideService(Mac.Mac, { ...mac, sign: unavailable }),
          Effect.flip
        )
        assert.strictEqual(error._tag, "ProofUnavailable")
        assert.notInclude(JSON.stringify(error), "private-backend-details")
      }).pipe(Effect.provide(webCryptoLayer)))
  }

  it.effect(`joins an interrupted native ${kind} proof operation before returning`, () =>
    Effect.gen(function*() {
      const proof = yield* makeProof(kind)
      let published = false
      yield* withNativeGate(kind === "token" ? "digest" : "sign", (gate) =>
        Effect.gen(function*() {
          const active = yield* proof.digest(Proofs.ProofId.make("proof"), binding, secret(kind), proof.activeKeyId)
            .pipe(
              Effect.tap(() =>
                Effect.sync(() => {
                  published = true
                })
              ),
              Effect.forkChild
            )
          yield* gate.entered
          const interrupted = yield* Fiber.interrupt(active).pipe(Effect.forkChild({ startImmediately: true }))
          yield* Effect.yieldNow
          assert.isFalse(gate.isSettled())
          assert.isUndefined(interrupted.pollUnsafe())
          yield* gate.release
          yield* Fiber.join(interrupted)
          assert.isTrue(gate.isSettled())
          assert.isFalse(published)
          const exit = yield* Fiber.await(active)
          assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
        }))
    }).pipe(Effect.provide(webCryptoLayer)))
}

it.effect("maps numeric proof key construction defects to configuration errors and wipes key bytes", () =>
  Effect.gen(function*() {
    let imported: Uint8Array | undefined
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        vi.spyOn(Mac, "key").mockImplementationOnce((_algorithm, bytes) => {
          imported = bytes
          return Effect.die(new Error("private-key-details"))
        })
      ),
      (mock) => Effect.sync(() => mock.mockRestore())
    )
    const error = yield* makeProof("numeric").pipe(Effect.flip)
    assert.strictEqual(error._tag, "ProofConfigurationError")
    assert.strictEqual(error.reason, "keyring")
    assert.notInclude(JSON.stringify(error), "private-key-details")
    assert.isDefined(imported)
    assert.isTrue(imported?.every((byte) => byte === 0))
  }).pipe(Effect.provide(webCryptoLayer)))
