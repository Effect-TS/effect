import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { PasswordConfigurationError } from "./errors.ts"

export const PasswordNormalization = Schema.Literals(["none", "NFC"])
export type PasswordNormalization = typeof PasswordNormalization.Type

export const PasswordPolicy = Schema.Struct({
  /** Trusted method configuration; never accept this selection from a caller.
   * always-mfa requires EVERY use, including recovery, to require another factor.
   */
  assurance: Schema.Literals(["single-factor", "always-mfa"]),
  normalization: PasswordNormalization,
  /** Application override; defaults to 15, or 8 when assurance is always-mfa. */
  minimumCodePoints: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 16384 }))
  ),
  maximumCodePoints: Schema.Int.check(Schema.isBetween({ minimum: 64, maximum: 16384 })),
  maximumBytes: Schema.Int.check(Schema.isBetween({ minimum: 256, maximum: 65536 })),
  /** Deadline for compromised-password screening; defaults to ten seconds, without retries. */
  screeningTimeoutMillis: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 30000 }))
  )
})

export type PasswordPolicy = typeof PasswordPolicy.Type

/** NIST SP800-63B-4: 15 code points, or 8 only when always part of MFA;
 * support managers/paste/spaces, no composition rules or forced reset cadence.
 */
export const defaultPasswordPolicy: PasswordPolicy = Object.freeze({
  assurance: "single-factor",
  normalization: "NFC",
  maximumCodePoints: 1024,
  maximumBytes: 4096,
  screeningTimeoutMillis: 10_000
})

export const validatePasswordPolicy = Effect.fnUntraced(function*(
  input: PasswordPolicy
) {
  const policy = yield* Schema.decodeEffect(PasswordPolicy)(input).pipe(
    Effect.mapError(() => PasswordConfigurationError.make({ component: "policy" }))
  )

  if (
    policy.maximumBytes < policy.maximumCodePoints * 4 ||
    (policy.minimumCodePoints ?? 0) > policy.maximumCodePoints
  ) {
    return yield* PasswordConfigurationError.make({ component: "policy" })
  }

  return Object.freeze(policy)
})
