import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { PasskeyConfigurationError } from "./errors.ts"
import { PasskeyProfile, PasskeyRequirement } from "./models.ts"
import { snapshotPasskey } from "./snapshot.ts"

const budget = Schema.Struct({
  limit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10000 })),
  windowMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 86400000 }))
})

export const PasskeyMethodPolicy = Schema.Struct({
  profiles: Schema.NonEmptyArray(PasskeyProfile).check(Schema.isMaxLength(32)),
  lifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  /** Charge begin and completion separately; discoverable sign-in adds its subject
   * charge after credential lookup. Rejected requests also consume budget. */
  admission: Schema.Struct({ global: budget, subject: budget, target: budget })
})

export type PasskeyMethodPolicy = typeof PasskeyMethodPolicy.Type

export const PasskeyManagementPolicy = Schema.Struct({
  maximumCredentials: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 })),
  /** Application-selected age limit; action requirements can impose a shorter one. */
  maximumEvidenceAgeMillis: PasskeyRequirement.fields.maximumAgeMillis,
  /** Require immediate revocation for removal; enrollment and metadata remain available
   * for session strategies without that capability. Unsupported removal fails before proof. */
  requireImmediateInvalidation: Schema.Boolean
})

export type PasskeyManagementPolicy = typeof PasskeyManagementPolicy.Type

export const validatePasskeyPolicy = Effect.fnUntraced(function*(
  input: PasskeyMethodPolicy
) {
  const policy = yield* snapshotPasskey(PasskeyMethodPolicy, input).pipe(
    Effect.mapError(() => PasskeyConfigurationError.make({}))
  )

  const ids = new Set<string>()

  for (const profile of policy.profiles) {
    if (
      ids.has(profile.profileId) ||
      new Set(profile.origins).size !== profile.origins.length ||
      new Set(profile.algorithms).size !== profile.algorithms.length
    ) {
      return yield* PasskeyConfigurationError.make({})
    }
    ids.add(profile.profileId)
    if (
      profile.primarySignIn &&
      (profile.userVerification !== "required" || profile.residentKey !== "required")
    ) {
      return yield* PasskeyConfigurationError.make({})
    }
    for (const origin of profile.origins) {
      const valid = yield* Effect.try({
        try: () => {
          const url = new URL(origin)

          return (
            url.origin === origin &&
            url.username === "" &&
            url.password === "" &&
            (url.protocol === "https:" ||
              (profile.developmentLocalhost &&
                profile.rpId === "localhost" &&
                url.hostname === "localhost" &&
                url.protocol === "http:")) &&
            (url.hostname === profile.rpId || url.hostname.endsWith("." + profile.rpId))
          )
        },
        catch: () => PasskeyConfigurationError.make({})
      })

      if (!valid) return yield* PasskeyConfigurationError.make({})
    }
  }

  return policy
})
