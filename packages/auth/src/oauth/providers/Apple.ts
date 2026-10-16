/**
 * Sign in with Apple clients with fresh ES256 client secrets and profiles from verified ID tokens.
 * Applications own callback validation, account linking, and session issuance.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Exit from "effect/Exit"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"

import * as Ownership from "../../internal/ownership.ts"
import * as Validation from "../../internal/validation.ts"
import * as Jwk from "../../jose/Jwk.ts"
import type * as Jws from "../../jose/Jws.ts"
import * as Jwt from "../../jose/Jwt.ts"
import type * as OAuth from "../OAuth.ts"
import { ConfigurationError, type Rejected, Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

const issuer = "https://appleid.apple.com"
const identifier = Schema.String.check(Schema.isPattern(/^[A-Z0-9]{10}$/u))
const lifetime = Validation.integer(1, 15777000)
const text = Schema.String.check(Schema.isMaxLength(256))
const flag = Schema.Union([Schema.Boolean, Schema.Literals(["true", "false"])]).pipe(
  Schema.decodeTo(Schema.Boolean, {
    decode: SchemaGetter.transform((value) => value === true || value === "true"),
    encode: SchemaGetter.transform((value) => value)
  })
)

/**
 * Apple profile claims. Email flags accept booleans or the strings true and false.
 * Callback names are unverified user input; decoding this schema alone does not authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  email_verified: Schema.optionalKey(flag),
  is_private_email: Schema.optionalKey(flag),
  real_user_status: Schema.optionalKey(Schema.Literals([0, 1, 2])),
  transfer_sub: Schema.optionalKey(text)
})

/**
 * Value described by the Profile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Profile = typeof Profile.Type

/**
 * Apple client configuration with a redacted PKCS8 PEM signing key.
 * Scopes default to openid; email and name are opt-in. Client secrets default to
 * 300 seconds and may live for at most 15,777,000 seconds.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends Omit<OAuthProvider.Options, "clientSecret"> {
  readonly teamId: string
  readonly keyId: string
  readonly privateKey: Redacted.Redacted<string>
  readonly scopes?: ReadonlyArray<"openid" | "email" | "name">
  readonly clientSecretLifetimeSeconds?: number
}

/**
 * Apple authorization inputs with the nonce saved in the transaction. Apple does not use PKCE.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput extends Omit<OAuthProvider.OidcAuthorizationInput, "codeChallenge"> {}

/**
 * A validated callback's code, original nonce, and optional redacted user JSON form field.
 * Only callback name fields supplement the signed profile; callback email is ignored.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExchangeInput extends Omit<OAuthProvider.OidcExchangeInput, "pkceVerifier"> {
  readonly user?: Redacted.Redacted<string>
}

/**
 * Service for a scoped Apple client. Code exchange verifies an RS256 ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client extends Context.Service<Client, {
  readonly oauth: OAuth.Client
  readonly authorizationUrl: (
    input: AuthorizationInput
  ) => Effect.Effect<Redacted.Redacted<string>, ConfigurationError | Unavailable>
  readonly exchangeCode: (
    input: ExchangeInput
  ) => Effect.Effect<
    OAuthProvider.ExchangeResult<Profile>,
    ConfigurationError | Rejected | Unavailable,
    Oidc.VerificationRequirements
  >
}>()("@effect/auth/oauth/providers/Apple/Client") {}

const SigningOptions = Schema.Struct({
  clientId: Validation.text(1024),
  teamId: identifier,
  keyId: identifier,
  privateKey: Validation.secret(16384),
  lifetimeSeconds: lifetime.pipe(Schema.withDecodingDefaultKey(Effect.succeed(300)))
})

const OptionsSchema = Schema.Struct({
  clientId: SigningOptions.fields.clientId,
  teamId: identifier,
  keyId: identifier,
  privateKey: SigningOptions.fields.privateKey,
  redirectUri: Provider.Options.fields.redirectUri,
  timeout: Provider.Options.fields.timeout,
  maxResponseBytes: Provider.Options.fields.maxResponseBytes,
  clientSecretLifetimeSeconds: SigningOptions.fields.lifetimeSeconds,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "email", "name"])).check(
      Schema.makeFilter((scopes) => new Set(scopes).size === scopes.length)
    )
  )
})

const Authorization = Schema.Struct({
  state: Provider.Authorization.fields.state,
  nonce: Validation.secret(256),
  prompt: Provider.Authorization.fields.prompt,
  loginHint: Provider.Authorization.fields.loginHint,
  maxAge: Schema.optionalKey(Validation.MaxAge)
})

const Exchange = Schema.Struct({
  code: Provider.Exchange.fields.code,
  nonce: Authorization.fields.nonce,
  maxAge: Authorization.fields.maxAge,
  user: Schema.optionalKey(Validation.secret(16384))
})

const CallbackUser = Schema.fromJsonString(Schema.Struct({
  name: Schema.optionalKey(Schema.Struct({
    firstName: Schema.optionalKey(text),
    lastName: Schema.optionalKey(text)
  }))
}))

const Claims = Schema.Struct({
  iss: identifier,
  sub: Validation.text(1024),
  aud: Schema.Literal(issuer),
  iat: Schema.Finite,
  exp: Schema.Finite
})

const wipeKey = (key: Jwk.PrivateKey) =>
  Effect.sync(() => {
    Redacted.value(key.material).fill(0)
    Redacted.wipeUnsafe(key.material)
    Redacted.wipeUnsafe(key.jwk)
  })

const importSigningKey = Effect.fnUntraced(function*(privateKey: Redacted.Redacted<string>, keyId: string) {
  const pem = yield* Validation.reveal(privateKey)
  const normalized = pem.replace(/\\r\\n|\\n/gu, "\n").trim()
  if (!normalized.startsWith("-----BEGIN PRIVATE KEY-----") || !normalized.endsWith("-----END PRIVATE KEY-----")) {
    return yield* ConfigurationError.make({ reason: "authentication" })
  }
  const decoded = Base64.decode(normalized.slice(27, -25).replace(/\s/gu, ""))
  if (Result.isFailure(decoded) || decoded.success.length === 0) {
    return yield* ConfigurationError.make({ reason: "authentication" })
  }
  return yield* Effect.acquireUseRelease(
    Effect.sync(() => Redacted.make(decoded.success)),
    (der) => Jwk.importPkcs8(der, "ES256", { kid: keyId }),
    (der) =>
      Effect.sync(() => {
        decoded.success.fill(0)
        Redacted.wipeUnsafe(der)
      })
  ).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(Cause.map(cause, () => ConfigurationError.make({ reason: "authentication" })))
    )
  )
})

const signClientSecret = Effect.fnUntraced(function*(
  options: {
    readonly teamId: string
    readonly clientId: string
    readonly keyId: string
    readonly lifetimeSeconds: number
  },
  key: Jwk.PrivateKey
) {
  const now = Math.floor(DateTime.toEpochMillis(yield* DateTime.now) / 1000)
  return yield* Jwt.sign(
    Claims,
    {
      iss: options.teamId,
      sub: options.clientId,
      aud: issuer,
      iat: now,
      exp: now + options.lifetimeSeconds
    },
    key,
    { alg: "ES256", kid: options.keyId }
  ).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
  )
})

/**
 * Mints Apple's ES256 client-secret JWT using the current clock and an owned copy of a PKCS8 PEM key.
 * The lifetime defaults to 300 seconds and cannot exceed 15,777,000 seconds.
 * Temporary key material is wiped; the caller owns the returned secret and input key handle.
 *
 * @stability unstable
 * @category cryptography
 * @since 4.1.0
 */
export const mintClientSecret = Effect.fnUntraced(function*(options: {
  readonly teamId: string
  readonly clientId: string
  readonly keyId: string
  readonly privateKey: Redacted.Redacted<string>
  readonly lifetimeSeconds?: number
}): Effect.fn.Return<Redacted.Redacted<string>, ConfigurationError | Unavailable, Jws.Requirements> {
  const { privateKey, ...policy } = yield* Validation.configuration(SigningOptions, options)
  return yield* Effect.acquireUseRelease(
    importSigningKey(privateKey, policy.keyId),
    (key) => signClientSecret(policy, key),
    wipeKey
  )
})

const mergeCallbackUser = (profile: Profile, user: string): Profile => {
  const decoded = Schema.decodeUnknownResult(CallbackUser)(user, { reportInput: false })
  if (Result.isFailure(decoded) || decoded.success.name === undefined) return profile
  const given = decoded.success.name.firstName?.trim()
  const family = decoded.success.name.lastName?.trim()
  const name = [given, family].filter((part) => part !== undefined && part.length > 0).join(" ")
  return {
    ...profile,
    ...(profile.given_name === undefined && given !== undefined && given.length > 0 ? { given_name: given } : {}),
    ...(profile.family_name === undefined && family !== undefined && family.length > 0 ? { family_name: family } : {}),
    ...(profile.name === undefined && name.length > 0 && name.length <= 256 ? { name } : {})
  }
}

/**
 * Discovers pinned Apple endpoints and creates a client using form_post callbacks and no PKCE.
 * A fresh ES256 client secret is minted for every code exchange; ID tokens must use RS256.
 *
 * **Gotchas**
 *
 * Validate callback state and consume the saved transaction before calling exchangeCode
 * with its original nonce. Apple returns the user form field only on first consent.
 * Its name is unverified display data and never replaces signed claims. The client
 * copies its private key and wipes the owned copy after in-flight work has stopped.
 *
 * @see {@link layer}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = Effect.fnUntraced(function*(
  input: Options
): Effect.fn.Return<Client["Service"], ConfigurationError | Unavailable, HttpClient.HttpClient | Scope.Scope> {
  const { privateKey, ...options } = yield* Validation.configuration(OptionsSchema, input)
  const scope = yield* Scope.fork(yield* Effect.scope, "sequential")
  return yield* Effect.gen(function*() {
    const key = yield* Effect.acquireRelease(importSigningKey(privateKey, options.keyId), wipeKey)
    const metadata = yield* Oidc.discover(issuer, options)
    if (
      metadata.issuer !== issuer ||
      metadata.authorization_endpoint !== issuer + "/auth/authorize" ||
      metadata.token_endpoint !== issuer + "/auth/token" ||
      metadata.jwks_uri !== issuer + "/auth/keys"
    ) return yield* ConfigurationError.make({ reason: "metadata" })
    const client = yield* Provider.makeOidc({
      client: {
        clientId: options.clientId,
        authentication: { method: "client_secret_post" },
        metadata,
        timeout: options.timeout,
        maxResponseBytes: options.maxResponseBytes
      },
      redirectUri: options.redirectUri,
      scopes: ["openid", ...(options.scopes ?? []).filter((scope) => scope !== "openid")],
      profile: Profile,
      subject: (_, verified) => Effect.succeed(verified.subject),
      pkce: false,
      responseMode: "form_post",
      verifier: { algorithms: ["RS256"], pkceS256: false },
      clientSecret: () => signClientSecret({ ...options, lifetimeSeconds: options.clientSecretLifetimeSeconds }, key)
    })
    const { use } = yield* Ownership.make
    const authorizationUrl = Effect.fnUntraced(function*(input: AuthorizationInput) {
      const value = yield* Validation.configuration(Authorization, input)
      return yield* client.authorizationUrl({
        ...value,
        ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge * 1000 })
      })
    }, use)
    const exchangeCode = Effect.fnUntraced(function*(input: ExchangeInput) {
      const { user, ...value } = yield* Validation.configuration(Exchange, input)
      return yield* Effect.acquireUseRelease(
        user === undefined ? Effect.succeed(undefined) : Provider.copySecret(user),
        (user) =>
          Effect.gen(function*() {
            const result = yield* client.exchangeCode({
              ...value,
              ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge * 1000 })
            })
            if (user === undefined) return result
            const profile = mergeCallbackUser(
              yield* Validation.reveal(result.identity.profile),
              yield* Validation.reveal(user)
            )
            Redacted.wipeUnsafe(result.identity.profile)
            return { ...result, identity: { ...result.identity, profile: Redacted.make(profile) } }
          }),
        (user) =>
          Effect.sync(() => {
            if (user !== undefined) Redacted.wipeUnsafe(user)
          })
      )
    }, use)
    return Client.of({ oauth: client.oauth, authorizationUrl, exchangeCode })
  }).pipe(
    Effect.provideService(Scope.Scope, scope),
    Effect.onError(() => Scope.close(scope, Exit.void))
  )
})

/**
 * Layer that discovers Apple metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
