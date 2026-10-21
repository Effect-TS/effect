import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Jwk from "../../../jose/Jwk.ts"
import * as Jwks from "../../../jose/Jwks.ts"
import * as Jwt from "../../../jose/Jwt.ts"

import type * as OAuthScope from "../../../OAuthScope.ts"
import { SubjectId } from "../../../Schema.ts"
import { origin } from "../../shared/origin.ts"
import {
  AccessClaims,
  BearerToken,
  ConfigurationError,
  InvalidToken,
  makeAccessSchema,
  makeScopesSchema,
  Random,
  Scope,
  Text,
  Unavailable,
  Url
} from "./models.ts"

/**
 * RFC 9068 access tokens use a distinct type and audience from ID tokens.
 *
 * @internal
 */
export const AccessTokenClaims = Schema.Struct({
  iss: Text,
  sub: SubjectId,
  aud: Text,
  iat: Schema.Natural,
  exp: Schema.Natural,
  jti: Random,
  grant_id: Random,
  client_id: Text,
  scope: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(8192)),
  auth_time: Schema.Natural,
  sid: Text,
  claims: Schema.optionalKey(AccessClaims)
})

/** @internal */
export type AccessTokenClaims = typeof AccessTokenClaims.Type

export interface AccessTokenVerifierOptions {
  readonly issuer: string
  readonly resource: string
  /** Trusted keys from the issuer's JWKS; reacquire this verifier when keys rotate. */
  readonly publicKeys: ReadonlyArray<Jwk.PublicJwk>
  /** Only these declared scopes are accepted when supplied. */
  readonly scopes?: ReadonlyArray<OAuthScope.OAuthScope>
}

const makeVerifier = Effect.fnUntraced(function*<Scope extends OAuthScope.OAuthScope>(
  options: AccessTokenVerifierOptions,
  scope: Schema.Codec<Scope, string>
) {
  const signature = yield* Signature.Signature
  const ScopeSchema = Schema.toType(scope)
  const ScopesSchema = makeScopesSchema(ScopeSchema)
  const AccessSchema = makeAccessSchema(ScopeSchema)

  const config = yield* Schema.decodeUnknownEffect(
    Schema.Struct({
      issuer: origin,
      resource: Url,
      publicKeys: Schema.NonEmptyArray(Jwk.PublicJwk).check(Schema.isMaxLength(16))
    })
  )(options, { reportInput: false }).pipe(Effect.mapError(() => ConfigurationError.make({})))

  const keys = yield* Jwks.makeLocal({ keys: config.publicKeys }).pipe(
    Effect.mapError(() => ConfigurationError.make({}))
  )

  const decode = Effect.fnUntraced(function*(credential: Redacted.Redacted<string>) {
    if (!Schema.is(BearerToken)(Redacted.value(credential))) return yield* InvalidToken.make({})

    const { claims } = yield* Jwt.verifyWithKeySet(AccessTokenClaims, credential, {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.resource,
      typ: "at+jwt",
      maxTokenAge: "600 seconds",
      requiredClaims: ["iss", "sub", "aud", "iat", "exp", "jti"]
    }).pipe(
      Effect.provideService(Jwks.Jwks, keys),
      Effect.provideService(Signature.Signature, signature),
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.map(cause, (error) =>
            error._tag === "JoseCryptoUnavailable" ? Unavailable.make({}) : InvalidToken.make({}))
        )
      )
    )

    const seconds = (yield* Clock.currentTimeMillis) / 1000

    if (
      claims.iat > seconds ||
      claims.exp <= seconds ||
      claims.exp <= claims.iat ||
      claims.exp - claims.iat > 600 ||
      claims.auth_time > claims.iat
    ) {
      return yield* InvalidToken.make({})
    }

    const scopes = yield* Schema.decodeUnknownEffect(ScopesSchema)(claims.scope.split(" ")).pipe(
      Effect.mapError(() => InvalidToken.make({}))
    )

    if (new Set(scopes).size !== scopes.length) return yield* InvalidToken.make({})

    return {
      claims,
      access: AccessSchema.make({
        subjectId: claims.sub,
        clientId: claims.client_id,
        grantId: claims.grant_id,
        resource: claims.aud,
        scopes,
        ...(claims.claims === undefined ? {} : { claims: claims.claims })
      })
    }
  })

  return {
    verify: Effect.fnUntraced(function*(credential: Redacted.Redacted<string>) {
      return (yield* decode(credential)).access
    }),
    /** Verified protocol fields for an issuer checking its durable grant version. */
    decode
  }
})

/** Verify offline with trusted public keys. Revocation and permission changes
 * take effect at token expiry; use short access lifetimes and renew through the issuer.
 * Retains only the signature service; verification uses the caller's clock and context.
 * Declared scopes narrow access only after every token scope passes validation.
 */
export function makeAccessTokenVerifier<const S extends ReadonlyArray<OAuthScope.OAuthScope>>(
  options: AccessTokenVerifierOptions & { readonly scopes: S }
): ReturnType<typeof makeVerifier<S[number]>>

export function makeAccessTokenVerifier(
  options: AccessTokenVerifierOptions
): ReturnType<typeof makeVerifier<OAuthScope.OAuthScope>>

export function makeAccessTokenVerifier(options: AccessTokenVerifierOptions) {
  return makeVerifier(
    options,
    options.scopes === undefined ? Scope : Schema.Literals(options.scopes)
  )
}
