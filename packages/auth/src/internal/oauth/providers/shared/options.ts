import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { OAuthGeneration, OAuthProviderKey } from "../../schema.ts"
import { OAuthCallbackId, OAuthIssuer, OAuthRedirectUri } from "../../signInModels.ts"
import { authentication as providerAuthentication } from "./configuration.ts"
import {
  defaultIdTokenSignedResponseAlgs,
  type IdTokenSignedResponseAlg,
  idTokenSignedResponseAlgs,
  type OidcProfileSchema,
  type OidcUserInfoMode,
  type OpenIdConnectAuthentication,
  OpenIdConnectConfigurationError,
  type ResponseIssuerMode
} from "./models.ts"
import { OidcUserProfile } from "./profile.ts"

/** A single callback is named after its provider unless callbackId is supplied.
 * Use callbacks for multiple destinations. URLs are validated, never inferred. */
export type RegistrationOptions =
  & {
    /** Defaults to 1. Increment when changing configuration; retain the previous
     * generation as retired until all flows using it have expired. */
    readonly configurationGeneration?: number
    /** Defaults to active. Retired generations only finish existing flows. */
    readonly issuance?: "active" | "retired"
  }
  & (
    | {
      readonly redirectUri: string
      readonly callbackId?: string
      readonly callbacks?: never
    }
    | {
      readonly callbacks: ReadonlyArray<{
        readonly callbackId: string
        readonly redirectUri: string
      }>
      readonly redirectUri?: never
      readonly callbackId?: never
    }
  )

const registrationFields = {
  configurationGeneration: OAuthGeneration.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1))),
  issuance: Schema.Literals(["active", "retired"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("active"))
  )
}

const registration = Schema.Union([
  Schema.Struct({
    ...registrationFields,
    redirectUri: OAuthRedirectUri,
    callbackId: Schema.optionalKey(OAuthCallbackId),
    callbacks: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({
    ...registrationFields,
    callbacks: Schema.Array(
      Schema.Struct({ callbackId: OAuthCallbackId, redirectUri: OAuthRedirectUri })
    ).check(Schema.isMinLength(1), Schema.isMaxLength(16)),
    redirectUri: Schema.optionalKey(Schema.Never),
    callbackId: Schema.optionalKey(Schema.Never)
  })
])

const invalid = () => OpenIdConnectConfigurationError.make({ reason: "provider" })

/** @internal */
export const resolveRegistration = Effect.fnUntraced(function*(
  input: RegistrationOptions,
  provider: string
) {
  const saved = yield* Schema.decodeEffect(registration)(input)

  return {
    configurationGeneration: saved.configurationGeneration,
    issuance: saved.issuance,
    callbacks: saved.callbacks ?? [
      {
        callbackId: saved.callbackId ?? (yield* Schema.decodeEffect(OAuthCallbackId)(provider)),
        redirectUri: saved.redirectUri
      }
    ]
  }
}, Effect.mapError(invalid))

type AuthenticationOptions =
  | {
    readonly clientSecret: Redacted.Redacted<string>
    /** Defaults to client_secret_basic. Public clients use authentication explicitly. */
    readonly tokenEndpointAuthMethod?: "client_secret_basic" | "client_secret_post"
    readonly authentication?: never
  }
  | {
    readonly authentication: OpenIdConnectAuthentication
    readonly clientSecret?: never
    readonly tokenEndpointAuthMethod?: never
  }

const authentication = Schema.Union([
  Schema.Struct({
    clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
    tokenEndpointAuthMethod: Schema.Literals(["client_secret_basic", "client_secret_post"]).pipe(
      Schema.withDecodingDefaultKey(Effect.succeed("client_secret_basic"))
    ),
    authentication: Schema.optionalKey(Schema.Never)
  }),
  Schema.Struct({
    authentication: Schema.toType(providerAuthentication),
    clientSecret: Schema.optionalKey(Schema.Never),
    tokenEndpointAuthMethod: Schema.optionalKey(Schema.Never)
  })
])

/** Shared input conventions for generic OAuth/OIDC sign-in and connected grants. */
export type ProviderOptions<P> = P extends { readonly protocol: "oauth" | "oidc" } ?
    & Omit<
      P,
      | "provider"
      | "issuer"
      | "configurationGeneration"
      | "issuance"
      | "callbacks"
      | "authentication"
      | "responseIssuerMode"
      | "idTokenSignedResponseAlg"
      | "pkceS256"
      | "userInfo"
      | "profileSchema"
    >
    & RegistrationOptions
    & AuthenticationOptions
    & {
      readonly provider: string
      readonly issuer: string
      /** Defaults to required. Use discovered to follow authorization_response_iss_parameter_supported. */
      readonly responseIssuerMode?: ResponseIssuerMode
      /** Defaults to true. Set false only for issuers that cannot complete
       * authorization-code + S256 PKCE. */
      readonly pkceS256?: boolean
    }
    & (P extends { readonly protocol: "oidc" } ? {
        readonly idTokenSignedResponseAlg?:
          | IdTokenSignedResponseAlg
          | ReadonlyArray<IdTokenSignedResponseAlg>
        /** Defaults to id-token. merge fetches UserInfo and fills missing claims. */
        readonly userInfo?: OidcUserInfoMode
        /** Defaults to OidcUserProfile. Presets pass their own schema. */
        readonly profileSchema?: OidcProfileSchema
      }
      : {})
  : never

/** @internal */
export const resolveIdTokenAlgorithms = (
  value: IdTokenSignedResponseAlg | ReadonlyArray<IdTokenSignedResponseAlg> | undefined
): ReadonlyArray<IdTokenSignedResponseAlg> =>
  idTokenSignedResponseAlgs.filter((algorithm) =>
    (value === undefined
      ? defaultIdTokenSignedResponseAlgs
      : Predicate.isString(value)
      ? [value]
      : value).includes(algorithm)
  )

/** @internal */
export const resolveOidcDefaults = <
  P extends {
    readonly idTokenSignedResponseAlg?:
      | IdTokenSignedResponseAlg
      | ReadonlyArray<IdTokenSignedResponseAlg>
    readonly pkceS256?: boolean
    readonly userInfo?: OidcUserInfoMode
    readonly profileSchema?: OidcProfileSchema
  }
>(
  input: P
) => ({
  idTokenSignedResponseAlg: resolveIdTokenAlgorithms(input.idTokenSignedResponseAlg),
  pkceS256: input.pkceS256 !== false,
  userInfo: input.userInfo === "merge" ? ("merge" as const) : ("id-token" as const),
  profileSchema: input.profileSchema ?? OidcUserProfile
})

/** @internal */
export const resolveProvider = Effect.fnUntraced(function*<
  P extends
    & {
      readonly provider: string
      readonly issuer: string
      readonly responseIssuerMode?: ResponseIssuerMode
    }
    & RegistrationOptions
    & AuthenticationOptions
>(input: P) {
  const credentials = yield* Schema.decodeEffect(authentication)(input).pipe(
    Effect.mapError(invalid)
  )

  return {
    ...input,
    ...(yield* resolveRegistration(input, input.provider)),
    provider: yield* Schema.decodeEffect(OAuthProviderKey)(input.provider).pipe(
      Effect.mapError(invalid)
    ),
    issuer: yield* Schema.decodeEffect(OAuthIssuer)(input.issuer).pipe(Effect.mapError(invalid)),
    responseIssuerMode: input.responseIssuerMode === undefined ? ("required" as const) : input.responseIssuerMode,
    authentication: credentials.authentication ?? {
      method: credentials.tokenEndpointAuthMethod,
      secret: credentials.clientSecret
    }
  }
})

/**
 * Capture caller-owned objects, including throwing getters or erased secrets.
 * Owned validation stays typed; unexpected input defects never retain credentials.
 *
 * @internal
 */
export const resolveOptions = <A, E, R>(resolve: () => Effect.Effect<A, E, R>) => Effect.suspend(resolve)
