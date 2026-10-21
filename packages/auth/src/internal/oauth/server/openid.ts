import * as Cause from "effect/Cause"
import type * as Mac from "effect/crypto/Mac"
import type * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Jwk from "../../../jose/Jwk.ts"
import * as Jwt from "../../../jose/Jwt.ts"

import { AccessTokenClaims } from "./accessToken.ts"
import type { Authentication } from "./models.ts"
import { ConfigurationError, OpenIdProfile, Text, Unavailable } from "./models.ts"

/** Keep retired public keys available while their ID and access tokens can still be accepted. */
export interface IdentitySigningKeys {
  readonly activeKeyId: string
  readonly privateKey: Redacted.Redacted<unknown>
  readonly publicKeys: ReadonlyArray<Jwk.PublicJwk>
}

const Subject = Schema.String.check(Schema.isPattern(/^[\x21-\x7e]{1,255}$/))

const IdentityToken = Schema.Struct({
  iss: Text,
  sub: Subject,
  aud: Text,
  iat: Schema.Natural,
  exp: Schema.Natural,
  auth_time: Schema.Natural,
  sid: Text,
  nonce: Schema.optionalKey(Text),
  ...OpenIdProfile.fields
})

/** @internal */
export const scopedProfile = (profile: OpenIdProfile, scopes: ReadonlyArray<string>) => ({
  ...(scopes.includes("profile")
    ? {
      ...(profile.name === undefined ? {} : { name: profile.name }),
      ...(profile.preferred_username === undefined
        ? {}
        : { preferred_username: profile.preferred_username })
    }
    : {}),
  ...(scopes.includes("email")
    ? {
      ...(profile.email === undefined ? {} : { email: profile.email }),
      ...(profile.email === undefined || profile.email_verified === undefined
        ? {}
        : { email_verified: profile.email_verified })
    }
    : {})
})

/** @internal */
export const makeIdentityTokens = Effect.fnUntraced(function*(options: IdentitySigningKeys) {
  const services = yield* Effect.context<Mac.Mac | Signature.Signature>()

  const keys = yield* Schema.decodeUnknownEffect(
    Schema.Struct({
      activeKeyId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
      privateKey: Schema.Redacted(Schema.Unknown),
      publicKeys: Schema.NonEmptyArray(Jwk.PublicJwk).check(Schema.isMaxLength(16))
    })
  )(options, { reportInput: false }).pipe(Effect.mapError(() => ConfigurationError.make({})))

  const signingKey = yield* Jwk.importPrivate(keys.privateKey, "RS256").pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
  )

  const privateJwk = Redacted.value(signingKey.jwk)
  const active = keys.publicKeys.find((key) => key.kid === keys.activeKeyId)

  if (
    privateJwk.kty !== "RSA" ||
    active?.kty !== "RSA" ||
    privateJwk.n !== active.n ||
    privateJwk.e !== active.e ||
    keys.publicKeys.some((key) => key.kid === undefined) ||
    new Set(keys.publicKeys.map((key) => key.kid)).size !== keys.publicKeys.length
  ) {
    return yield* ConfigurationError.make({})
  }

  for (const key of keys.publicKeys) {
    yield* Jwk.importPublic(key, "RS256").pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
    )
  }

  return {
    jwks: { keys: keys.publicKeys },
    issueAccess: (claims: AccessTokenClaims) =>
      Jwt.sign(AccessTokenClaims, claims, signingKey, {
        alg: "RS256",
        kid: keys.activeKeyId,
        typ: "at+jwt"
      }).pipe(
        Effect.provideContext(services),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
      ),
    issue: Effect.fnUntraced(function*(input: {
      readonly issuer: string
      readonly clientId: string
      readonly authentication: Authentication
      readonly nonce?: string
      readonly profile: OpenIdProfile
      readonly scopes: ReadonlyArray<string>
      readonly nowMillis: number
    }) {
      const issuedAt = Math.floor(input.nowMillis / 1000)

      return yield* Jwt.sign(
        IdentityToken,
        {
          iss: input.issuer,
          sub: input.authentication.subjectId,
          aud: input.clientId,
          iat: issuedAt,
          exp: Math.min(issuedAt + 300, Math.floor(input.authentication.expiresAtMillis / 1000)),
          auth_time: Math.floor(input.authentication.authenticatedAtMillis / 1000),
          sid: input.authentication.sessionId,
          ...(input.nonce === undefined ? {} : { nonce: input.nonce }),
          ...scopedProfile(input.profile, input.scopes)
        },
        signingKey,
        { alg: "RS256", kid: keys.activeKeyId, typ: "JWT" }
      ).pipe(
        Effect.provideContext(services),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
      )
    })
  }
})
