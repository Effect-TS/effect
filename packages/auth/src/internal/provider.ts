import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import * as OAuth from "../OAuth.ts"
import { type ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Ownership from "./ownership.ts"
import * as Validation from "./validation.ts"

/** @internal */
export const Options = Schema.Struct({
  clientId: Validation.text(1024),
  clientSecret: Validation.secret(4096),
  redirectUri: Validation.Callback,
  ...Validation.RequestOptions.fields,
  timeout: Validation.RequestOptions.fields.timeout.pipe(Schema.withDecodingDefaultKey(Effect.succeed(10000)))
})

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

const OidcAuthorization = Schema.Struct({
  ...Authorization.fields,
  nonce: Validation.secret(256),
  maxAge: Schema.optionalKey(Validation.MaxAge)
})

const OidcExchange = Schema.Struct({
  ...Exchange.fields,
  nonce: Validation.secret(256),
  maxAge: Schema.optionalKey(Validation.MaxAge)
})

/** @internal */
export const copySecret = (secret: Redacted.Redacted<string>) =>
  Validation.reveal(secret).pipe(Effect.map(Redacted.make))

/** @internal */
export const makeOidc = Effect.fnUntraced(function*<Profile>(options: {
  readonly client: OAuth.ClientOptions
  readonly redirectUri: string
  readonly scopes: ReadonlyArray<string>
  readonly profile: Schema.Codec<Profile, unknown, never, never>
  readonly subject: (profile: Profile, verified: Oidc.Verified, issuer: string) => Effect.Effect<string, Rejected>
  readonly authorizationParameters?: (
    input: typeof OidcAuthorization.Type
  ) => Effect.Effect<Readonly<Record<string, string>>, ConfigurationError>
  readonly prompt?: OAuth.AuthorizationInput["prompt"]
}) {
  const oauth = yield* OAuth.make(options.client)
  const verifier = yield* Oidc.makeVerifier({
    metadata: oauth.metadata,
    clientId: options.client.clientId,
    timeout: options.client.timeout,
    ...(options.client.maxResponseBytes === undefined ? {} : { maxResponseBytes: options.client.maxResponseBytes }),
    algorithms: ["RS256"]
  })
  const { use } = yield* Ownership.make

  const authorizationUrl = Effect.fnUntraced(function*(input: OAuthProvider.OidcAuthorizationInput) {
    const value = yield* Validation.configuration(OidcAuthorization, input)
    const parameters = options.authorizationParameters === undefined
      ? undefined
      : yield* options.authorizationParameters(value)
    const prompt = value.prompt ?? options.prompt
    return yield* oauth.authorizationUrl({
      ...value,
      redirectUri: options.redirectUri,
      scopes: options.scopes,
      ...(parameters === undefined ? {} : { parameters }),
      ...(prompt === undefined ? {} : { prompt }),
      ...(value.maxAge === undefined ? {} : { maxAge: value.maxAge * 1000 })
    })
  }, use)

  const exchangeCode = Effect.fnUntraced(function*(input: OAuthProvider.OidcExchangeInput) {
    const value = yield* Validation.configuration(OidcExchange, input)
    return yield* Effect.acquireUseRelease(
      Effect.try({
        try: () => {
          // Capture all transaction secrets before dispatch, even if the caller erases its handles during I/O.
          const code = Redacted.value(value.code)
          const pkceVerifier = Redacted.value(value.pkceVerifier)
          const nonce = Redacted.value(value.nonce)
          return { code: Redacted.make(code), pkceVerifier: Redacted.make(pkceVerifier), nonce: Redacted.make(nonce) }
        },
        catch: () => Unavailable.make({})
      }),
      ({ code, nonce, pkceVerifier }) =>
        Effect.gen(function*() {
          const verificationStartedAt = yield* DateTime.now
          const receipt = yield* oauth.codeGrant({ code, pkceVerifier, redirectUri: options.redirectUri })
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
          const profile = yield* Validation.decode(options.profile, claims).pipe(
            Effect.mapError(() => Rejected.make({ reason: "claims" }))
          )
          const issuer = yield* Validation.decode(Validation.Issuer, claims.iss)
          const subject = yield* options.subject(profile, verified, issuer)
          return {
            receipt,
            tokens,
            identity: { issuer, subject, profile: Redacted.make(profile) }
          } satisfies OAuthProvider.ExchangeResult<Profile>
        }),
      ({ code, nonce, pkceVerifier }) =>
        Effect.sync(() => {
          Redacted.wipeUnsafe(code)
          Redacted.wipeUnsafe(pkceVerifier)
          Redacted.wipeUnsafe(nonce)
        })
    )
  }, use)

  return { oauth, authorizationUrl, exchangeCode }
})
