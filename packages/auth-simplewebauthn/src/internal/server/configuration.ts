import {
  PasskeyConfigurationError,
  PasskeyProfile,
  PasskeyProtocolRejected,
  samePasskey,
  snapshotPasskey
} from "@effect/auth/Passkey"
import { reportAuthFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { parse } from "tldts"

import { SimpleWebAuthnPasskeyProtocolOptions } from "./models.ts"

/**
 * Validate an immutable profile selected at issue. Verification intentionally
 * accepts that persisted selection through its ceremony lifetime during deploys.
 *
 * @internal
 */
export const validateSimpleWebAuthnProfile = Effect.fn("validateSimpleWebAuthnProfile")(function*(
  input: PasskeyProfile
) {
  const profile = yield* snapshotPasskey(PasskeyProfile, input).pipe(
    Effect.mapError(() => PasskeyConfigurationError.make({}))
  )

  if (
    new Set(profile.origins).size !== profile.origins.length ||
    new Set(profile.algorithms).size !== profile.algorithms.length ||
    (profile.primarySignIn &&
      (profile.residentKey !== "required" || profile.userVerification !== "required"))
  ) {
    return yield* PasskeyConfigurationError.make({})
  }

  const valid = yield* Effect.try({
    try: () => {
      const host = new URL(`https://${profile.rpId}`).hostname

      if (host !== profile.rpId) return false

      const domain = parse(host, {
        allowIcannDomains: true,
        allowPrivateDomains: true,
        extractHostname: false,
        validateHostname: true,
        detectIp: true
      })

      if (
        host === "localhost"
          ? !profile.developmentLocalhost
          : domain.isIp || domain.domain === null || domain.publicSuffix === host
      ) {
        return false
      }

      return profile.origins.every((origin) => {
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
          (url.hostname === profile.rpId ||
            (profile.rpId !== "localhost" && url.hostname.endsWith(`.${profile.rpId}`)))
        )
      })
    },
    catch: () => PasskeyConfigurationError.make({})
  })

  if (!valid) return yield* PasskeyConfigurationError.make({})

  return profile
})

/** @internal */
export const captureSimpleWebAuthnProfiles = Effect.fn("captureSimpleWebAuthnProfiles")(
  function*(options: SimpleWebAuthnPasskeyProtocolOptions) {
    const captured = yield* snapshotPasskey(SimpleWebAuthnPasskeyProtocolOptions, options).pipe(
      Effect.mapError(() => PasskeyConfigurationError.make({}))
    )

    const keys = new Set<string>()

    for (const profile of captured.profiles) {
      const key = `${profile.rpId}/${profile.profileId}`

      if (keys.has(key)) return yield* PasskeyConfigurationError.make({})
      keys.add(key)
      yield* validateSimpleWebAuthnProfile(profile)
    }

    return Effect.fn("selectSimpleWebAuthnProfile")(function*(input: PasskeyProfile) {
      const profile = captured.profiles.find(
        (value) => value.rpId === input.rpId && value.profileId === input.profileId
      )

      if (profile === undefined || !(yield* samePasskey(PasskeyProfile, profile, input))) {
        return yield* PasskeyProtocolRejected.make({})
      }

      return profile
    })
  },
  Effect.catchCause((cause) =>
    Cause.hasDies(cause)
      ? reportAuthFailure("passkey-protocol", cause).pipe(
        Effect.andThen(Effect.fail(PasskeyConfigurationError.make({})))
      )
      : Effect.failCause(cause)
  )
)
