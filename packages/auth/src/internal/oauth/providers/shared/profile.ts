import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

import { OAuthProtocolRejected } from "../../signInErrors.ts"
import type { OAuthDisplayProfile } from "../../signInModels.ts"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/** Standard OpenID Connect user claims projected from verified ID tokens.
 * Protocol claims and credentials are excluded; provider assertions never
 * authorize local account linking by themselves. */
export const OidcStandardUserProfile = Schema.Struct({
  name: Schema.optionalKey(text),
  given_name: Schema.optionalKey(text),
  family_name: Schema.optionalKey(text),
  middle_name: Schema.optionalKey(text),
  nickname: Schema.optionalKey(text),
  preferred_username: Schema.optionalKey(text),
  profile: Schema.optionalKey(url),
  picture: Schema.optionalKey(url),
  website: Schema.optionalKey(url),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  email_verified: Schema.optionalKey(Schema.Boolean),
  gender: Schema.optionalKey(text),
  birthdate: Schema.optionalKey(text),
  zoneinfo: Schema.optionalKey(text),
  locale: Schema.optionalKey(text),
  phone_number: Schema.optionalKey(text),
  phone_number_verified: Schema.optionalKey(Schema.Boolean),
  address: Schema.optionalKey(
    Schema.Struct({
      formatted: Schema.optionalKey(url),
      street_address: Schema.optionalKey(url),
      locality: Schema.optionalKey(text),
      region: Schema.optionalKey(text),
      postal_code: Schema.optionalKey(text),
      country: Schema.optionalKey(text)
    })
  ),
  updated_at: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }))
  )
})

export type OidcStandardUserProfile = typeof OidcStandardUserProfile.Type

const firstConsentName = Schema.Struct({
  name: Schema.optionalKey(
    Schema.Struct({
      firstName: Schema.optionalKey(text),
      lastName: Schema.optionalKey(text)
    })
  )
})

/**
 * Merge Apple's first-consent `user` form field into ID-token claims. Name is
 * only sent once; later callbacks leave these fields absent.
 *
 * @internal
 */
export const mergeAppleCallbackUser = Effect.fnUntraced(function*(
  claims: Schema.JsonObject,
  user: string | undefined
) {
  if (user === undefined) return claims

  const parsed = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown))(user).pipe(
    Effect.orElseSucceed(() => undefined)
  )

  if (parsed === undefined) return claims

  const payload = yield* Schema.decodeUnknownEffect(firstConsentName)(parsed).pipe(
    Effect.orElseSucceed(() => undefined)
  )

  if (payload?.name === undefined) return claims
  const given = payload.name.firstName?.trim()
  const family = payload.name.lastName?.trim()

  const parts = [given, family].filter(
    (value): value is string => value !== undefined && value.length > 0
  )

  const name = parts.join(" ")
  // given_name and family_name each allow 256. The combined name must too.
  const mergedName = name.length > 0 && name.length <= 256 ? name : undefined

  return {
    ...claims,
    ...(given === undefined || given.length === 0 || claims.given_name !== undefined
      ? {}
      : { given_name: given }),
    ...(family === undefined || family.length === 0 || claims.family_name !== undefined
      ? {}
      : { family_name: family }),
    ...(mergedName === undefined || claims.name !== undefined ? {} : { name: mergedName })
  }
})

/** Standard OpenID Connect user claims, plus Google's optional hosted domain.
 * Generic OIDC uses this schema unless a preset supplies its own. The adapter
 * projects these from verified ID tokens, optionally merged with UserInfo.
 * Protocol claims and credentials are excluded; provider assertions never
 * authorize local account linking by themselves. */
export const OidcUserProfile = Schema.Struct({
  ...OidcStandardUserProfile.fields,
  /** Hosted domain for a Google Workspace or Cloud organization. Present when
   * the verified claims include `hd`. */
  hd: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(253)))
})

export type OidcUserProfile = typeof OidcUserProfile.Type

const standardFlags = ["email_verified", "phone_number_verified"] as const

/** Keep every standard claim, and replace only flags the host codec normalized. */
const claimsWithHostFlags = (claims: unknown, profile: Schema.JsonObject) =>
  Schema.decodeUnknownEffect(Schema.Record(Schema.String, Schema.Unknown))(claims).pipe(
    Effect.map((raw) => {
      const normalized = { ...raw }

      for (const key of standardFlags) {
        const value = profile[key]

        if (Predicate.isBoolean(value)) normalized[key] = value
      }

      return normalized
    })
  )

/** @internal */
export const decodeOidcProfile = Effect.fnUntraced(function*(
  claims: unknown,
  schema: Schema.Codec<Schema.JsonObject>
): Effect.fn.Return<OAuthDisplayProfile | undefined, OAuthProtocolRejected> {
  // oxlint-disable-next-line no-restricted-properties -- Project claims from an ID token already verified against this issuer.
  const profile = yield* Schema.decodeUnknownEffect(schema)(claims).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthProtocolRejected.make({}))))
  )

  // A host codec may turn Apple's "true"/"false" into a boolean and drop every
  // other claim. Display still comes from the verified claims; only that flag moves.
  const display = yield* Schema.decodeUnknownEffect(OidcStandardUserProfile)(claims).pipe(
    Effect.catch(() =>
      claimsWithHostFlags(claims, profile).pipe(
        Effect.flatMap((value) => Schema.decodeEffect(OidcStandardUserProfile)(value))
      )
    ),
    Effect.mapError(() => OAuthProtocolRejected.make({}))
  )

  if (Object.keys(profile).length === 0) return undefined
  const displayName = display.name?.trim() || display.preferred_username

  return {
    ...(displayName === undefined ? {} : { displayName }),
    ...(display.preferred_username === undefined ? {} : { handle: display.preferred_username }),
    ...(display.picture === undefined ? {} : { avatarUrl: display.picture }),
    ...(display.profile === undefined ? {} : { profileUrl: display.profile }),
    ...(display.email === undefined ? {} : { email: display.email }),
    ...(display.email_verified === undefined ? {} : { emailVerified: display.email_verified }),
    providerData: profile
  }
})
