import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Jwk from "../../../jose/Jwk.ts"
import * as Jwks from "../../../jose/Jwks.ts"

import * as OAuthScope from "../../../OAuthScope.ts"
import { SubjectId } from "../../../Schema.ts"

export class Unavailable extends Schema.TaggedError<Unavailable>()("OAuthServerUnavailable", {}) {}

export class InvalidToken extends Schema.TaggedError<InvalidToken>()(
  "OAuthServerInvalidToken",
  {}
) {}

export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  "OAuthServerConfigurationError",
  {}
) {}

/** @internal */
export const Text = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048))
/** @internal */
export const Random = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
export const Scope = OAuthScope.OAuthScope
/** @internal */
export const Scopes = Schema.NonEmptyArray(Scope).check(Schema.isMaxLength(32))

/** @internal */
export const makeScopesSchema = <Scope extends OAuthScope.OAuthScope>(
  scope: Schema.Codec<Scope, string>
) => Schema.NonEmptyArray(scope).check(Schema.makeFilter(Schema.is(Scopes)))

/** Application claims stay nested so they cannot replace protocol claims. */
export const AccessClaims = Schema.Record(Schema.String, Schema.Json)
/** @internal */
export const BearerToken = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(16384))
/** @internal */
export const maximumClientAssertionLength = 8192

/** @internal */
export class Rejected extends Schema.TaggedError<Rejected>()("OAuthServerRejected", {
  error: Schema.Literals([
    "invalid_request",
    "invalid_client",
    "invalid_grant",
    "invalid_scope",
    "unsupported_grant_type",
    "unsupported_response_type",
    "invalid_target",
    "unauthorized_client",
    "access_denied",
    "login_required",
    "consent_required"
  ])
}) {}

/** @internal */
export const reject = (error: Rejected["error"] = "invalid_request") => Rejected.make({ error })

/** @internal */
export const Url = Text.check(
  Schema.makeFilter((text) => {
    try {
      const url = new URL(text)

      return (
        !url.username &&
        !url.password &&
        !text.includes("#") &&
        !/[\s\\]/.test(text) &&
        (url.protocol === "https:" ||
          (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      )
    } catch {
      return false
    }
  })
)

/** @internal */
export const RedirectUri = Url.check(
  Schema.makeFilter(
    (text) => !["code", "state", "iss", "error"].some((key) => new URL(text).searchParams.has(key))
  )
)

/** @internal */
export const AssertionAlgorithms = ["RS256", "PS256", "ES256", "EdDSA"] as const

/**
 * Exactly one registered public key source; never resolve a key URL from a JWT.
 *
 * @internal
 */
export const ClientAssertion = Schema.Struct({
  jwks: Schema.optionalKey(Jwks.KeySet),
  jwksUri: Schema.optionalKey(Url),
  algorithm: Schema.optionalKey(Jwk.AsymmetricAlgorithm)
}).check(
  Schema.makeFilter((value) => (value.jwks === undefined) !== (value.jwksUri === undefined))
)

export const Client = Schema.Struct({
  clientId: Text,
  name: Text,
  redirectUris: Schema.NonEmptyArray(RedirectUri).check(Schema.isMaxLength(16)),
  applicationType: Schema.optionalKey(Schema.Literals(["web", "native"])),
  /** Pre-registered confidential clients authenticate using Basic or form credentials. */
  clientSecret: Schema.optionalKey(Schema.Redacted(Text, { disallowJsonEncode: true })),
  /** Authenticate with private_key_jwt instead of a shared secret. */
  clientAssertion: Schema.optionalKey(ClientAssertion),
  grantTypes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["authorization_code", "refresh_token"]))
  )
}).check(
  Schema.makeFilter(
    (value) => value.clientSecret === undefined || value.clientAssertion === undefined
  )
)

export type Client = typeof Client.Type

/**
 * Private transport payloads: never expose tokens as public workflow results.
 *
 * @internal
 */
export const TokenResponse = Schema.Struct({
  access_token: BearerToken,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Natural,
  refresh_token: Schema.optionalKey(Text),
  id_token: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(16384))
  ),
  scope: Text
})

/** @internal */
export const AuthorizationMetadata = Schema.Struct({
  issuer: Text,
  authorization_endpoint: Text,
  token_endpoint: Text,
  revocation_endpoint: Text,
  response_types_supported: Schema.Array(Schema.Literal("code")),
  grant_types_supported: Schema.Array(Schema.Literals(["authorization_code", "refresh_token"])),
  token_endpoint_auth_methods_supported: Schema.Array(
    Schema.Literals(["none", "client_secret_basic", "client_secret_post", "private_key_jwt"])
  ),
  token_endpoint_auth_signing_alg_values_supported: Schema.Array(Jwk.AsymmetricAlgorithm),
  revocation_endpoint_auth_methods_supported: Schema.Array(
    Schema.Literals(["none", "client_secret_basic", "client_secret_post", "private_key_jwt"])
  ),
  revocation_endpoint_auth_signing_alg_values_supported: Schema.Array(Jwk.AsymmetricAlgorithm),
  code_challenge_methods_supported: Schema.Array(Schema.Literal("S256")),
  authorization_response_iss_parameter_supported: Schema.Literal(true),
  client_id_metadata_document_supported: Schema.Boolean,
  scopes_supported: Scopes
})

/** @internal */
export const ResourceMetadata = Schema.Struct({
  resource: Text,
  authorization_servers: Schema.NonEmptyArray(Text),
  scopes_supported: Scopes,
  bearer_methods_supported: Schema.Array(Schema.Literal("header"))
})

/** @internal */
export const Authorization = Schema.Struct({
  clientId: Text,
  redirectUri: Text,
  scopes: Scopes,
  challenge: Random,
  state: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048))),
  nonce: Schema.optionalKey(Text),
  prompt: Schema.optionalKey(Schema.Literals(["none", "login", "consent", "select_account"])),
  maxAgeSeconds: Schema.optionalKey(Schema.Natural),
  requestedAtMillis: Schema.optionalKey(Schema.Natural)
})

/** @internal */
export type Authorization = typeof Authorization.Type

/** Verified application authentication, never values supplied by an OAuth client. */
export const Authentication = Schema.Struct({
  subjectId: SubjectId,
  sessionId: Text,
  securityRevision: Text,
  authenticatedAtMillis: Schema.Natural,
  expiresAtMillis: Schema.Natural
})

export type Authentication = typeof Authentication.Type

/** Application-approved claims. Scope filtering happens before credential delivery. */
export const OpenIdProfile = Schema.Struct({
  name: Schema.optionalKey(Text.check(Schema.isMaxLength(256))),
  preferred_username: Schema.optionalKey(Text.check(Schema.isMaxLength(256))),
  email: Schema.optionalKey(Text.check(Schema.isMaxLength(320))),
  email_verified: Schema.optionalKey(Schema.Boolean)
})

export type OpenIdProfile = typeof OpenIdProfile.Type

/** @internal */
export const OpenIdMetadata = Schema.Struct({
  issuer: Text,
  authorization_endpoint: Text,
  token_endpoint: Text,
  userinfo_endpoint: Schema.optionalKey(Text),
  jwks_uri: Text,
  revocation_endpoint: Text,
  response_types_supported: Schema.Array(Schema.Literal("code")),
  response_modes_supported: Schema.Array(Schema.Literal("query")),
  grant_types_supported: Schema.Array(Schema.Literals(["authorization_code", "refresh_token"])),
  subject_types_supported: Schema.Array(Schema.Literal("public")),
  id_token_signing_alg_values_supported: Schema.Array(Schema.Literal("RS256")),
  token_endpoint_auth_methods_supported: Schema.Array(Schema.String),
  token_endpoint_auth_signing_alg_values_supported: Schema.Array(Jwk.AsymmetricAlgorithm),
  code_challenge_methods_supported: Schema.Array(Schema.Literal("S256")),
  authorization_response_iss_parameter_supported: Schema.Literal(true),
  scopes_supported: Scopes,
  claims_supported: Schema.Array(Text),
  claims_parameter_supported: Schema.Literal(false),
  request_parameter_supported: Schema.Literal(false),
  request_uri_parameter_supported: Schema.Literal(false)
})

/** @internal */
export const UserInfo = Schema.Struct({ sub: SubjectId, ...OpenIdProfile.fields })

/** One record owns consent, code redemption and the entire refresh family.
 * Revocation is monotonic; a stale CAS must never reactivate a revoked grant.
 * No bearer credentials or provider tokens are persisted here.
 */
export const Record = Schema.Struct({
  version: Random,
  status: Schema.Literals(["Pending", "Consent", "Code", "Active", "Revoked"]),
  authorization: Authorization,
  subjectId: Schema.optionalKey(SubjectId),
  authentication: Schema.optionalKey(Authentication),
  claims: Schema.optionalKey(AccessClaims),
  expiresAtMillis: Schema.Natural
})

export type Record = typeof Record.Type

export const makeAccessSchema = <Scope extends OAuthScope.OAuthScope>(
  scope: Schema.Codec<Scope, string>
) =>
  Schema.Struct({
    subjectId: SubjectId,
    grantId: Random,
    clientId: Text,
    resource: Text,
    scopes: makeScopesSchema(scope),
    claims: Schema.optionalKey(AccessClaims)
  })

export const Access = makeAccessSchema(Scope)

export type Access<Scope extends OAuthScope.OAuthScope = OAuthScope.OAuthScope> = ReturnType<
  typeof makeAccessSchema<Scope>
>["Type"]

/** Request-local authenticated authority. Absent outside protected requests;
 * callers must reject undefined. Never provide a principal at server startup.
 * A Reference models absent authentication without a fake construction-time
 * identity when Effect registers toolkit handlers. MCP client IDs are unrelated.
 */
export const CurrentAccess = Context.Reference<Access | undefined>(
  "@effect/auth/OAuthServer/CurrentAccess",
  { defaultValue: () => undefined }
)

/** A consumed assertion's identity and retention deadline, never its signed credential. */
export const AssertionReceipt = Schema.Struct({
  /** SHA-256 of the JSON tuple [clientId, jti], encoded as unpadded base64url. */
  id: Random,
  expiresAtMillis: Schema.Natural
})

export type AssertionReceipt = typeof AssertionReceipt.Type

/** Linearizable, standalone commits. Never retry an ambiguous insert or CAS.
 * Revoke must atomically disable the record, including against concurrent CAS.
 * Grant IDs must never be reused. Retain records through expiresAtMillis;
 * only then may they be deleted.
 */
export class Persistence extends Context.Service<
  Persistence,
  {
    /** Atomically consume (issuer namespace, receipt id) once, across processes.
     * Retain through expiresAtMillis. An unknown commit outcome must fail closed;
     * never retry the insert or release a consumed receipt after a later failure.
     */
    readonly consumeAssertion: (
      namespace: string,
      receipt: AssertionReceipt
    ) => Effect.Effect<boolean, Unavailable>
    readonly get: (namespace: string, id: string) => Effect.Effect<Record | undefined, Unavailable>
    readonly insert: (
      namespace: string,
      id: string,
      record: Record
    ) => Effect.Effect<boolean, Unavailable>
    readonly compareAndSet: (
      namespace: string,
      id: string,
      version: string,
      record: Record
    ) => Effect.Effect<boolean, Unavailable>
    readonly revoke: (namespace: string, id: string) => Effect.Effect<void, Unavailable>
  }
>()("@effect/auth/OAuthServer/Persistence") {}
