import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { OAuthProtocolRejected } from "../../signInErrors.ts"
import type { OAuthProtocolConfiguration, OAuthVerifiedExternalIdentity } from "../../signInModels.ts"
import type { githubVerifiedPrimaryEmail, TokenCompatibility, tokenCompatibility } from "./compatibility.ts"
import type { DiscoveryProfile, discoveryProfile } from "./discovery.ts"

export const IdTokenSignedResponseAlg = Schema.Literals([
  "RS256",
  "PS256",
  "ES256",
  "EdDSA",
  "HS256"
])

export type IdTokenSignedResponseAlg = typeof IdTokenSignedResponseAlg.Type

/** @internal */
export const defaultIdTokenSignedResponseAlgs: ReadonlyArray<IdTokenSignedResponseAlg> = [
  "RS256",
  "PS256",
  "ES256",
  "EdDSA"
]

/** @internal */
export const idTokenSignedResponseAlgs: ReadonlyArray<IdTokenSignedResponseAlg> = [
  "RS256",
  "PS256",
  "ES256",
  "EdDSA",
  "HS256"
]

/** @internal */
export const advertisedIdTokenAlgorithms = (
  advertised: ReadonlyArray<string> | undefined,
  allowed: ReadonlyArray<IdTokenSignedResponseAlg>
): ReadonlyArray<IdTokenSignedResponseAlg> | undefined => {
  const supported = idTokenSignedResponseAlgs.filter(
    (algorithm) => allowed.includes(algorithm) && advertised?.includes(algorithm)
  )

  return supported.length === 0 ? undefined : supported
}

export const OidcUserInfoMode = Schema.Literals(["id-token", "merge"])
export type OidcUserInfoMode = typeof OidcUserInfoMode.Type

export type OidcProfileSchema = Schema.Codec<Schema.JsonObject>

export type OidcSubjectDecoder = (claims: unknown) => Effect.Effect<string, OAuthProtocolRejected>

export class OpenIdConnectConfigurationError extends Schema.TaggedError<OpenIdConnectConfigurationError>()(
  "OpenIdConnectConfigurationError",
  {
    reason: Schema.Literals([
      "provider",
      "generation",
      "issuer",
      "callback",
      "authentication",
      "parameters",
      "metadata",
      "identity-source"
    ])
  }
) {}

/** PKCS8 DER, base64, retained until the provider scope closes. Signing yields Signature. */
export interface PrivateKeyJwt {
  readonly algorithm: "ES256"
  readonly keyId: string
  readonly issuer: string
  readonly subject: string
  readonly audience: string
  readonly lifetimeSeconds: number
  readonly privateKey: Redacted.Redacted<string>
}

export type OpenIdConnectAuthentication =
  | { readonly method: "client_secret_basic"; readonly secret: Redacted.Redacted<string> }
  | { readonly method: "client_secret_post"; readonly secret: Redacted.Redacted<string> }
  | { readonly method: "client_secret_post"; readonly privateKeyJwt: PrivateKeyJwt }
  | { readonly method: "none"; readonly publicClient: true }

/** @internal */
export const isPrivateKeyAuthentication = (
  authentication: OpenIdConnectAuthentication
): authentication is {
  readonly method: "client_secret_post"
  readonly privateKeyJwt: PrivateKeyJwt
} => "privateKeyJwt" in authentication

/** @internal */
export const hasStaticSecret = (
  authentication: OpenIdConnectAuthentication
): authentication is
  | { readonly method: "client_secret_basic"; readonly secret: Redacted.Redacted<string> }
  | { readonly method: "client_secret_post"; readonly secret: Redacted.Redacted<string> } => "secret" in authentication

export interface PlainOAuthIdentity {
  readonly subject: string
  readonly profile?: NonNullable<OAuthVerifiedExternalIdentity["profile"]>
}

/** `discovered` stores the mode implied by authorization_response_iss_parameter_supported. */
export type ResponseIssuerMode = "required" | "unsupported" | "discovered"

/** @internal */
export const persistedResponseIssuerMode = (
  mode: ResponseIssuerMode,
  authorizationResponseIssParameterSupported: boolean | undefined
): OAuthProtocolConfiguration["responseIssuerMode"] =>
  mode === "discovered"
    ? authorizationResponseIssParameterSupported === true
      ? "required"
      : "unsupported"
    : mode

interface ProviderGeneration {
  readonly provider: OAuthProtocolConfiguration["provider"]
  readonly configurationGeneration: OAuthProtocolConfiguration["configurationGeneration"]
  readonly issuance: "active" | "retired"
  /** Preserve this exact issuer identifier, including an optional trailing slash. */
  readonly issuer: OAuthProtocolConfiguration["issuer"]
  readonly responseIssuerMode: ResponseIssuerMode
  readonly clientId: string
  readonly authentication: OpenIdConnectAuthentication
  readonly callbacks: ReadonlyArray<{
    readonly callbackId: OAuthProtocolConfiguration["callbackId"]
    readonly redirectUri: OAuthProtocolConfiguration["redirectUri"]
  }>
  readonly scopes: ReadonlyArray<string>
  readonly authorizationParameters?: Readonly<Record<string, string>>
  readonly tokenParameters?: Readonly<Record<string, string>>
  /** Defaults to query. */
  readonly responseMode?: "query" | "form_post"
}

export interface OpenIdConnectOidcProvider extends ProviderGeneration {
  /** @internal Provider-specific discovery metadata, retained by the configuration codec. */
  readonly [discoveryProfile]?: typeof DiscoveryProfile.Type
  readonly protocol: "oidc"
  readonly idTokenSignedResponseAlg: ReadonlyArray<IdTokenSignedResponseAlg>
  readonly pkceS256: boolean
  readonly userInfo: OidcUserInfoMode
  readonly profileSchema: OidcProfileSchema
  /** Defaults to the verified ID-token `sub`. Presets that cannot use `sub` or
   * email as the durable subject supply their own decoder over verified claims. */
  readonly decodeSubject?: OidcSubjectDecoder
  readonly maxAgeSeconds?: number
}

export type PlainOAuthIdentityDecoder<R = never> = (
  body: unknown
) => Effect.Effect<PlainOAuthIdentity, OAuthProtocolRejected, R>

export interface PlainOAuthHttpIdentitySource<R = never> {
  readonly from?: undefined
  readonly url: string
  /** Defaults to GET. Linear and Dropbox use POST. */
  readonly method?: "GET" | "POST"
  readonly headers?: Readonly<Record<string, string>>
  /** JSON object string for POST identity calls that send a body. */
  readonly body?: string
  /** Receives the identity HTTP body. Never put access tokens in the result. */
  readonly decodeIdentity: PlainOAuthIdentityDecoder<R>
}

export interface PlainOAuthTokenIdentitySource<R = never> {
  readonly from: "token"
  /** Receives the token receipt JSON. Never put access or refresh tokens in the result. */
  readonly decodeIdentity: PlainOAuthIdentityDecoder<R>
}

export type PlainOAuthIdentitySource<R = never> =
  | PlainOAuthHttpIdentitySource<R>
  | PlainOAuthTokenIdentitySource<R>

export interface OpenIdConnectOAuthProvider<R = never> extends ProviderGeneration {
  /** @internal First-party provider behavior, retained by the configuration codec. */
  readonly [tokenCompatibility]?: TokenCompatibility
  /** @internal Opt-in GitHub email lookup, retained by the generation codec. */
  readonly [githubVerifiedPrimaryEmail]?: boolean
  readonly protocol: "oauth"
  readonly authorizationEndpoint: string
  readonly tokenEndpoint: string
  readonly pkceS256: boolean
  /** Defaults to form. Notion's token endpoint requires JSON. */
  readonly tokenBodyFormat?: "form" | "json"
  /** Defaults to a space. Linear's authorize URL requires commas. */
  readonly scopeSeparator?: " " | ","
  readonly identitySource: PlainOAuthIdentitySource<R>
}

export interface OpenIdConnectOAuthProtocolOptions<R = never> {
  readonly providers: ReadonlyArray<OpenIdConnectOidcProvider | OpenIdConnectOAuthProvider<R>>
  /** Per-request deadline; the method separately limits the complete exchange. */
  readonly timeoutSeconds: number
}
