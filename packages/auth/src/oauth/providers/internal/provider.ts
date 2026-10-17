import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import * as Ownership from "../../../internal/ownership.ts"
import * as Validation from "../../../internal/validation.ts"
import * as OAuth from "../../OAuth.ts"
import { ConfigurationError, Rejected, Unavailable } from "../../OAuthError.ts"
import type * as OAuthProvider from "../../OAuthProvider.ts"
import * as Oidc from "../../Oidc.ts"

/** @internal */
export const Options = Schema.Struct({
  clientId: Validation.text(1024),
  clientSecret: Validation.secret(4096),
  redirectUri: Validation.Callback,
  ...Validation.RequestOptions.fields,
  timeout: Validation.RequestOptions.fields.timeout.pipe(Schema.withDecodingDefaultKey(Effect.succeed(10000)))
})

/** @internal */
export const OidcScopes = Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
  Schema.isUnique(),
  Schema.makeFilter((scopes) => scopes.includes("openid"))
)

/** @internal */
export const Authorization = Schema.Struct({
  state: Validation.secret(256),
  codeChallenge: Validation.Challenge,
  prompt: Schema.optionalKey(Schema.Literals(["none", "login", "consent", "select_account"])),
  loginHint: Schema.optionalKey(Validation.text(1024))
})

/** @internal */
export const Exchange = Schema.Struct({
  code: Validation.secret(8192),
  pkceVerifier: Validation.Verifier
})

const OptionalAuthorization = Schema.Struct({
  ...Authorization.fields,
  codeChallenge: Schema.optionalKey(Validation.Challenge)
})

const OptionalExchange = Schema.Struct({
  ...Exchange.fields,
  pkceVerifier: Schema.optionalKey(Validation.Verifier)
})

const OidcAuthorization = Schema.Struct({
  ...OptionalAuthorization.fields,
  nonce: Validation.secret(256),
  maxAge: Schema.optionalKey(Validation.MaxAge)
})

const OidcExchange = Schema.Struct({
  ...OptionalExchange.fields,
  nonce: Validation.secret(256),
  maxAge: Schema.optionalKey(Validation.MaxAge)
})

const ProfileSubject = Schema.Struct({ sub: Validation.text(1024) })

/** @internal */
export const copySecret = (secret: Redacted.Redacted<string>) =>
  Validation.reveal(secret).pipe(Effect.map(Redacted.make))

const Configuration = Schema.Struct({
  redirectUri: Validation.Callback,
  scopes: Validation.Scopes,
  pkce: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  prompt: Authorization.fields.prompt,
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"]))
})

const withSecrets = <Secrets extends Readonly<Record<string, Redacted.Redacted<string> | undefined>>, A, E, R>(
  secrets: Secrets,
  use: (secrets: Secrets) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.try({
      try: () => {
        // Reveal all inputs before allocating handles, so partial capture cannot leak.
        const values = Object.entries(secrets).map(([key, value]) =>
          [
            key,
            value === undefined ? undefined : Redacted.value(value)
          ] as const
        )
        return Object.fromEntries(values.map(([key, value]) => [
          key,
          value === undefined ? undefined : Redacted.make(value)
        ])) as Secrets
      },
      catch: () => Unavailable.make({})
    }),
    use,
    (owned) =>
      Effect.sync(() => {
        for (const secret of Object.values(owned)) {
          if (secret !== undefined) Redacted.wipeUnsafe(secret)
        }
      })
  )

const profileClaims = <Profile>(schema: Schema.Codec<Profile, unknown, never, never>, input: unknown) =>
  Effect.suspend(() => Schema.decodeUnknownEffect(schema)(input, { reportInput: false })).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
  )

type AuthorizationInput = Omit<OAuthProvider.AuthorizationInput, "codeChallenge"> & {
  readonly codeChallenge?: string
}

type ExchangeInput = Omit<OAuthProvider.ExchangeInput, "pkceVerifier"> & {
  readonly pkceVerifier?: Redacted.Redacted<string>
}

/** @internal */
export const makeOAuth = Effect.fnUntraced(function*<Profile>(options: {
  readonly client: OAuth.ClientOptions
  readonly redirectUri: string
  readonly scopes: ReadonlyArray<string>
  readonly profile: Schema.Codec<Profile, unknown, never, never>
  readonly subject: (profile: Profile) => Effect.Effect<string, Rejected>
  readonly authorizationParameters?: (
    input: typeof OptionalAuthorization.Type
  ) => Effect.Effect<Readonly<Record<string, string>>, ConfigurationError>
  readonly prompt?: OAuth.AuthorizationInput["prompt"]
  readonly pkce?: boolean
  readonly tokens?: (receipt: OAuth.TokenReceipt) => Effect.Effect<OAuth.TokenSet, Rejected | Unavailable>
  readonly loadProfile?: (
    oauth: OAuth.Client,
    tokens: OAuth.TokenSet,
    receipt: OAuth.TokenReceipt
  ) => Effect.Effect<unknown, ConfigurationError | Rejected | Unavailable>
}) {
  const configuration = Validation.freeze(yield* Validation.configuration(Configuration, options))
  const oauth = yield* OAuth.make(options.client)
  const { use } = yield* Ownership.make
  const { authorizationParameters, loadProfile, profile: schema, subject, tokens: normalize = OAuth.tokens } = options

  const authorizationUrl = Effect.fnUntraced(function*(input: AuthorizationInput) {
    const value = yield* Validation.configuration(OptionalAuthorization, input)
    if (configuration.pkce && value.codeChallenge === undefined) {
      return yield* ConfigurationError.make({ reason: "parameters" })
    }
    const { codeChallenge, ...authorization } = value
    return yield* withSecrets({ state: value.state }, ({ state }) =>
      Effect.gen(function*() {
        const parameters = authorizationParameters === undefined
          ? undefined
          : yield* authorizationParameters({ ...value, state })
        const prompt = value.prompt ?? configuration.prompt
        return yield* oauth.authorizationUrl({
          ...authorization,
          state,
          redirectUri: configuration.redirectUri,
          scopes: configuration.scopes,
          ...(!configuration.pkce || codeChallenge === undefined ? {} : { codeChallenge }),
          ...(parameters === undefined ? {} : { parameters }),
          ...(prompt === undefined ? {} : { prompt })
        })
      }))
  }, use)

  const exchangeCode = Effect.fnUntraced(function*(input: ExchangeInput) {
    const value = yield* Validation.configuration(OptionalExchange, input)
    if (configuration.pkce && value.pkceVerifier === undefined) {
      return yield* ConfigurationError.make({ reason: "parameters" })
    }
    return yield* withSecrets(
      { code: value.code, pkceVerifier: configuration.pkce ? value.pkceVerifier : undefined },
      ({ code, pkceVerifier }) =>
        Effect.gen(function*() {
          const receipt = yield* oauth.codeGrant({
            code,
            redirectUri: configuration.redirectUri,
            ...(pkceVerifier === undefined ? {} : { pkceVerifier })
          })
          const tokens = yield* normalize(receipt)
          const raw = loadProfile === undefined
            ? yield* oauth.fetchProfile(tokens.accessToken)
            : yield* loadProfile(oauth, tokens, receipt)
          const profile = yield* profileClaims(schema, raw)
          return {
            receipt,
            tokens,
            identity: {
              issuer: oauth.metadata.issuer,
              subject: yield* subject(profile),
              profile: Redacted.make(profile)
            }
          } satisfies OAuthProvider.ExchangeResult<Profile>
        })
    )
  }, use)

  return { oauth, authorizationUrl, exchangeCode }
})

interface OidcOptions<Profile> {
  readonly client: OAuth.ClientOptions
  readonly redirectUri: string
  readonly scopes: ReadonlyArray<string>
  readonly profile: Schema.Codec<Profile, unknown, never, never>
  readonly subject: (profile: Profile, verified: Oidc.Verified, issuer: string) => Effect.Effect<string, Rejected>
  readonly authorizationParameters?: (
    input: typeof OidcAuthorization.Type
  ) => Effect.Effect<Readonly<Record<string, string>>, ConfigurationError>
  readonly prompt?: OAuth.AuthorizationInput["prompt"]
  readonly pkce?: boolean
  readonly responseMode?: OAuth.AuthorizationInput["responseMode"]
  readonly verifier?: Pick<Oidc.VerifierOptions, "algorithms" | "clientSecret" | "pkceS256">
  readonly clientSecret?: () => Effect.Effect<
    Redacted.Redacted<string>,
    ConfigurationError | Unavailable,
    Oidc.VerificationRequirements
  >
  readonly loadProfile?: (
    oauth: OAuth.Client,
    tokens: OAuth.TokenSet,
    verified: Oidc.Verified
  ) => Effect.Effect<OAuth.JsonObject, ConfigurationError | Rejected | Unavailable>
}

/** @internal */
export const makeOidc = Effect.fnUntraced(function*<Profile>(options: OidcOptions<Profile>) {
  const configuration = Validation.freeze(yield* Validation.configuration(Configuration, options))
  const oauth = yield* OAuth.make(options.client)
  const verifier = yield* withSecrets(
    { clientSecret: options.verifier?.clientSecret },
    ({ clientSecret }) =>
      Oidc.makeVerifier({
        metadata: oauth.metadata,
        clientId: options.client.clientId,
        timeout: options.client.timeout,
        ...(options.client.maxResponseBytes === undefined ? {} : { maxResponseBytes: options.client.maxResponseBytes }),
        algorithms: options.verifier?.algorithms ?? ["RS256"],
        pkceS256: configuration.pkce && (options.verifier?.pkceS256 ?? true),
        ...(clientSecret === undefined ? {} : { clientSecret })
      })
  )
  const { use } = yield* Ownership.make
  const { authorizationParameters, clientSecret: createClientSecret, loadProfile, profile: schema, subject } = options

  const authorizationUrl = Effect.fnUntraced(function*(
    input: AuthorizationInput & Pick<OAuthProvider.OidcAuthorizationInput, "nonce" | "maxAge">
  ) {
    const value = yield* Validation.configuration(OidcAuthorization, input)
    if (configuration.pkce && value.codeChallenge === undefined) {
      return yield* ConfigurationError.make({ reason: "parameters" })
    }
    const { codeChallenge, ...authorization } = value
    return yield* withSecrets({ state: value.state, nonce: value.nonce }, ({ nonce, state }) =>
      Effect.gen(function*() {
        const parameters = authorizationParameters === undefined
          ? undefined
          : yield* authorizationParameters({ ...value, state, nonce })
        const prompt = value.prompt ?? configuration.prompt
        return yield* oauth.authorizationUrl({
          ...authorization,
          state,
          nonce,
          redirectUri: configuration.redirectUri,
          scopes: configuration.scopes,
          ...(!configuration.pkce || codeChallenge === undefined ? {} : { codeChallenge }),
          ...(parameters === undefined ? {} : { parameters }),
          ...(prompt === undefined ? {} : { prompt }),
          ...(configuration.responseMode === undefined ? {} : { responseMode: configuration.responseMode }),
          ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge * 1000 })
        })
      }))
  }, use)

  const exchangeCode = Effect.fnUntraced(function*(
    input: ExchangeInput & Pick<OAuthProvider.OidcExchangeInput, "nonce" | "maxAge">
  ) {
    const value = yield* Validation.configuration(OidcExchange, input)
    if (configuration.pkce && value.pkceVerifier === undefined) {
      return yield* ConfigurationError.make({ reason: "parameters" })
    }
    return yield* withSecrets(
      { code: value.code, pkceVerifier: configuration.pkce ? value.pkceVerifier : undefined, nonce: value.nonce },
      ({ code, nonce, pkceVerifier }) =>
        Effect.gen(function*() {
          const verificationStartedAt = yield* DateTime.now
          const grant = (clientSecret?: Redacted.Redacted<string>) =>
            oauth.codeGrant({
              code,
              redirectUri: configuration.redirectUri,
              ...(pkceVerifier === undefined ? {} : { pkceVerifier }),
              ...(clientSecret === undefined ? {} : { clientSecret })
            })
          const receipt = createClientSecret === undefined ? yield* grant() : yield* Effect.scoped(
            Effect.gen(function*() {
              const clientSecret = yield* Effect.acquireRelease(
                createClientSecret(),
                (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret)),
                { interruptible: true }
              )
              return yield* grant(clientSecret)
            })
          )
          const tokens = yield* OAuth.tokens(receipt)
          if (tokens.idToken === undefined) return yield* Unavailable.make({})
          const verified = yield* verifier.verify(tokens.idToken, {
            verificationStartedAt,
            nonce,
            accessToken: tokens.accessToken,
            code,
            ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge * 1000 })
          })
          const claims = yield* Validation.reveal(verified.claims)
          let profileInput: unknown = claims
          if (loadProfile !== undefined) {
            const loaded = yield* loadProfile(oauth, tokens, verified)
            const binding = yield* profileClaims(ProfileSubject, loaded)
            if (binding.sub !== verified.subject) return yield* Rejected.make({ reason: "claims" })
            profileInput = { ...loaded, ...claims }
          }
          const profile = yield* profileClaims(schema, profileInput)
          const issuer = yield* Validation.decode(Validation.Issuer, claims.iss)
          const identitySubject = yield* subject(profile, verified, issuer)
          return {
            receipt,
            tokens,
            identity: { issuer, subject: identitySubject, profile: Redacted.make(profile) }
          } satisfies OAuthProvider.ExchangeResult<Profile>
        })
    )
  }, use)

  return { oauth, authorizationUrl, exchangeCode }
})

/** @internal */
export const makeOidcClient = Effect.fnUntraced(function*<Profile, Metadata extends OAuth.Metadata>(
  options: typeof Options.Type,
  configuration: Omit<OidcOptions<Profile>, "client" | "redirectUri" | "subject" | "verifier" | "clientSecret"> & {
    readonly metadata: Effect.Effect<Metadata, ConfigurationError | Unavailable, HttpClient.HttpClient>
    readonly authentication: "client_secret_basic" | "client_secret_post"
    readonly profileRequest?: (metadata: Metadata) => NonNullable<OAuth.ClientOptions["profile"]>
    readonly subject?: OidcOptions<Profile>["subject"]
    readonly verifier?:
      | OidcOptions<Profile>["verifier"]
      | (
        (secret: Redacted.Redacted<string>) => NonNullable<OidcOptions<Profile>["verifier"]>
      )
  }
) {
  const { authentication, metadata: discover, profileRequest, subject, verifier, ...settings } = configuration
  const scopes = Object.freeze([...settings.scopes])
  // Capture before discovery yields, and release the temporary copy after the client takes ownership.
  return yield* Effect.acquireUseRelease(
    copySecret(options.clientSecret),
    (clientSecret) =>
      Effect.gen(function*() {
        const metadata = yield* discover
        return yield* makeOidc({
          ...settings,
          client: {
            clientId: options.clientId,
            authentication: { method: authentication, secret: clientSecret },
            metadata,
            timeout: options.timeout,
            maxResponseBytes: options.maxResponseBytes,
            ...(profileRequest === undefined ? {} : { profile: profileRequest(metadata) })
          },
          redirectUri: options.redirectUri,
          scopes,
          subject: subject ?? ((_, verified) => Effect.succeed(verified.subject)),
          ...(verifier === undefined ? {} : {
            verifier: typeof verifier === "function" ? verifier(clientSecret) : verifier
          })
        })
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})
