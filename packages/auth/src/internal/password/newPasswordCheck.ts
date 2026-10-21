import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { timeoutWithCause } from "../shared/timeout.ts"
import { CompromisedPasswords, PasswordScreening, PasswordScreeningContext } from "./compromisedPasswords.ts"
import { NewPasswordRejected, PasswordCheckUnavailable } from "./errors.ts"
import {
  defaultPasswordPolicy,
  type PasswordNormalization,
  type PasswordPolicy,
  validatePasswordPolicy
} from "./policy.ts"

export interface CheckedNewPassword {
  readonly password: Redacted.Redacted<string>
  readonly normalization: PasswordNormalization
}

/** Apply only to new credentials. Persist normalization beside the verifier;
 * login uses that stored mode, while legacy verification/rehash retains none.
 */
export class NewPasswordCheck extends Context.Service<
  NewPasswordCheck,
  {
    readonly check: (
      password: Redacted.Redacted<string>,
      context?: PasswordScreeningContext
    ) => Effect.Effect<CheckedNewPassword, NewPasswordRejected | PasswordCheckUnavailable>
  }
>()("@effect/auth/NewPasswordCheck") {
  static readonly layer = (input: PasswordPolicy = defaultPasswordPolicy) => {
    const snapshot = { ...input }

    return Layer.effect(
      this,
      Effect.gen(function*() {
        const policy = yield* validatePasswordPolicy(snapshot)
        const screening = (yield* CompromisedPasswords).check

        return NewPasswordCheck.of({
          check: Effect.fn("NewPasswordCheck.check")(function*(password, context = {}) {
            const checkedContext = Object.freeze(
              yield* Schema.decodeEffect(PasswordScreeningContext)(context).pipe(
                Effect.mapError(() => PasswordCheckUnavailable.make({}))
              )
            )

            const raw = Redacted.value(password)

            yield* Schema.decodeEffect(
              Schema.String.check(Schema.isMaxLength(policy.maximumBytes))
            )(raw).pipe(Effect.mapError(() => NewPasswordRejected.make({ reason: "too-long" })))
            yield* Schema.decodeEffect(
              Schema.String.check(Schema.isPattern(/^[^\uD800-\uDFFF]*$/u))
            )(raw).pipe(Effect.mapError(() => NewPasswordRejected.make({ reason: "ill-formed" })))
            const value = policy.normalization === "NFC" ? raw.normalize("NFC") : raw
            const length = [...value].length

            if (
              length < (policy.minimumCodePoints ?? (policy.assurance === "single-factor" ? 15 : 8))
            ) {
              return yield* NewPasswordRejected.make({ reason: "too-short" })
            }
            if (
              length > policy.maximumCodePoints ||
              new TextEncoder().encode(value).byteLength > policy.maximumBytes
            ) {
              return yield* NewPasswordRejected.make({ reason: "too-long" })
            }
            const normalized = Redacted.make(value)

            const result = yield* Effect.suspend(() => screening(normalized, checkedContext)).pipe(
              timeoutWithCause(policy.screeningTimeoutMillis ?? 10_000),
              Effect.flatMap(Schema.decodeEffect(PasswordScreening)),
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasswordCheckUnavailable.make({}))))
            )

            if (result._tag === "Rejected") {
              return yield* NewPasswordRejected.make({ reason: result.reason })
            }

            return Object.freeze({ password: normalized, normalization: policy.normalization })
          })
        })
      })
    )
  }
}
