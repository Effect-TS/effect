import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as Kdf from "effect/crypto/Kdf"
import type { KdfBusy } from "effect/crypto/KdfAdmission"
import { KdfAdmission } from "effect/crypto/KdfAdmission"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import { equalBytes } from "../shared/equalBytes.ts"
import {
  defaultPasswordHashingConfig,
  type PasswordHashingConfig,
  validatePasswordHashingConfig
} from "./configuration.ts"
import { PasswordHashingUnavailable, PasswordInputInvalid, PasswordKdfBusy, PasswordVerifierInvalid } from "./errors.ts"
import { EncodedPasswordHash } from "./models.ts"
import { parsePasswordHash, phcBase64 } from "./passwordEncoding.ts"

const encoder = new TextEncoder()

const isPasswordFailure = <
  E extends
    | PasswordHashingUnavailable
    | PasswordInputInvalid
    | PasswordKdfBusy
    | PasswordVerifierInvalid
>(
  error: E | KdfBusy
): error is E => error._tag !== "KdfBusy"

const ownBytes = <E, R>(acquire: Effect.Effect<Uint8Array, E, R>) =>
  Effect.acquireRelease(acquire, (bytes) => Effect.sync(() => bytes.fill(0)), {
    interruptible: true
  })

/** @internal */
export const make = (input: PasswordHashingConfig = defaultPasswordHashingConfig) => {
  const snapshot = {
    ...input,
    ...(input.scrypt === undefined ? {} : { scrypt: { ...input.scrypt } })
  }

  return Effect.gen(function*() {
    const config = yield* validatePasswordHashingConfig(snapshot)
    const admission = yield* KdfAdmission
    const kdf = yield* Kdf.Kdf
    const random = yield* SecureRandom.SecureRandom

    const passwordBytes = Effect.fnUntraced(function*(
      password: Redacted.Redacted<string>
    ) {
      const value = yield* Effect.try({
        try: () => Redacted.value(password),
        catch: () => PasswordHashingUnavailable.make({})
      })

      yield* Schema.decodeEffect(
        Schema.String.check(Schema.isMaxLength(config.maximumPasswordBytes))
      )(value).pipe(Effect.mapError(() => PasswordInputInvalid.make({ reason: "too-long" })))

      const buffer = yield* ownBytes(
        Effect.sync(() => new Uint8Array(config.maximumPasswordBytes))
      )

      const encoded = encoder.encodeInto(value, buffer)

      if (encoded.read !== value.length) {
        return yield* PasswordInputInvalid.make({ reason: "too-long" })
      }

      return buffer.subarray(0, encoded.written)
    })

    const failure = () => PasswordHashingUnavailable.make({})

    // Adapt native failures without masking cancellation of portable derivations.
    const deriveBytes = (algorithm: Kdf.Algorithm, password: Uint8Array, salt: Uint8Array, length: number) =>
      Effect.suspend(() => kdf.derive(algorithm, password, { salt, length })).pipe(
        Effect.mapError(failure),
        Effect.catchDefect(() => Effect.fail(failure()))
      )

    const derive = (
      password: Uint8Array,
      salt: Uint8Array,
      memoryKiB: number,
      passes: number,
      parallelism: number,
      length: number
    ) => deriveBytes(Kdf.argon2id({ memory: memoryKiB, passes, parallelism }), password, salt, length)

    const deriveScrypt = (
      password: Uint8Array,
      salt: Uint8Array,
      cost: number,
      blockSize: number,
      parallelism: number,
      length: number
    ) => deriveBytes(Kdf.scrypt({ cost, blockSize, parallelism }), password, salt, length)

    const deriveCurrent = (password: Uint8Array, salt: Uint8Array) =>
      config.scrypt === undefined
        ? derive(password, salt, config.memoryKiB, config.passes, config.parallelism, 32)
        : deriveScrypt(
          password,
          salt,
          config.scrypt.cost,
          config.scrypt.blockSize,
          config.scrypt.parallelism,
          32
        )

    const withPassword = <
      A,
      E extends
        | PasswordHashingUnavailable
        | PasswordInputInvalid
        | PasswordKdfBusy
        | PasswordVerifierInvalid,
      P,
      E2 extends
        | PasswordHashingUnavailable
        | PasswordInputInvalid
        | PasswordKdfBusy
        | PasswordVerifierInvalid
    >(
      password: Redacted.Redacted<string>,
      prepare: Effect.Effect<P, E2, Scope.Scope>,
      body: (bytes: Uint8Array, prepared: P) => Effect.Effect<A, E, Scope.Scope>
    ) =>
      admission
        .run(
          Effect.scoped(
            Effect.gen(function*() {
              const prepared = yield* prepare
              const bytes = yield* passwordBytes(password)

              return yield* body(bytes, prepared)
            })
          )
        )
        .pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) =>
                isPasswordFailure<E | E2 | PasswordHashingUnavailable | PasswordInputInvalid>(error)
                  ? error
                  : PasswordKdfBusy.make({}))
            )
          )
        )

    return {
      hash: (password: Redacted.Redacted<string>) =>
        withPassword(
          password,
          Effect.void,
          Effect.fnUntraced(function*(bytes) {
            const salt = yield* ownBytes(
              random
                .randomBytes(16)
                .pipe(
                  Effect.catchCause((cause) =>
                    Effect.failCause(Cause.map(cause, () => PasswordHashingUnavailable.make({})))
                  )
                )
            )

            const output = yield* ownBytes(deriveCurrent(bytes, salt))

            const prefix = config.scrypt === undefined
              ? `$argon2id$v=19$m=${config.memoryKiB},t=${config.passes},p=${config.parallelism}`
              : `$scrypt$ln=${
                Math.log2(config.scrypt.cost)
              },r=${config.scrypt.blockSize},p=${config.scrypt.parallelism}`

            return Redacted.make(
              EncodedPasswordHash.make(`${prefix}$${phcBase64(salt)}$${phcBase64(output)}`)
            )
          })
        ),
      verify: (
        password: Redacted.Redacted<string>,
        verifier: Redacted.Redacted<EncodedPasswordHash>
      ) =>
        withPassword(
          password,
          Effect.try({
            try: () => Redacted.value(verifier),
            catch: () => PasswordVerifierInvalid.make({ reason: "malformed" })
          }).pipe(Effect.flatMap((value) => parsePasswordHash(value, config))),
          Effect.fnUntraced(function*(bytes, parsed) {
            const output = yield* ownBytes(
              parsed._tag === "Argon2id"
                ? derive(
                  bytes,
                  parsed.salt,
                  parsed.memoryKiB,
                  parsed.passes,
                  parsed.parallelism,
                  parsed.expected.length
                )
                : parsed._tag === "Scrypt"
                ? deriveScrypt(
                  bytes,
                  parsed.salt,
                  parsed.cost,
                  parsed.blockSize,
                  parsed.parallelism,
                  parsed.expected.length
                )
                : deriveBytes(
                  Kdf.pbkdf2({ hash: Digest.sha256, iterations: parsed.iterations }),
                  bytes,
                  parsed.salt,
                  32
                )
            )

            // Fixed-length byte comparison; JavaScript/JIT gives no hard timing guarantee.
            const matches = equalBytes(output, parsed.expected)

            const upgrade = parsed._tag === "LegacyPbkdf2" ||
              parsed.salt.length < 16 ||
              parsed.expected.length < 32 ||
              (parsed._tag === "Scrypt"
                ? config.scrypt === undefined ||
                  parsed.cost < config.scrypt.cost ||
                  parsed.blockSize < config.scrypt.blockSize ||
                  parsed.parallelism < config.scrypt.parallelism
                : parsed._tag === "Argon2id" &&
                  // Argon2 parallelism does not compensate for weak memory/passes.
                  (config.scrypt !== undefined ||
                    parsed.memoryKiB < config.memoryKiB ||
                    parsed.passes < config.passes))

            return { matches, needsRehash: matches && upgrade }
          })
        ),
      dummy: (password: Redacted.Redacted<string>) =>
        withPassword(
          password,
          Effect.void,
          (bytes) => ownBytes(deriveCurrent(bytes, new Uint8Array(16))).pipe(Effect.asVoid)
        )
    }
  })
}
