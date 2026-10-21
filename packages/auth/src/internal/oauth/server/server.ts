import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder"
import * as HttpApiSecurity from "effect/http-api/HttpApiSecurity"
import * as Cookies from "effect/http/Cookies"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpServerResponse from "effect/http/HttpServerResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type * as Types from "effect/Types"

import type * as OAuthScope from "../../../OAuthScope.ts"
import { SubjectId } from "../../../Schema.ts"
import { makeSessionSigningCodec, type SessionSigningKeyring } from "../../sessions/crypto.ts"
import { reportAuthFailure, ReportedOperationDefect } from "../../shared/diagnostics.ts"
import { origin as Origin } from "../../shared/origin.ts"
import { timeoutWithCause } from "../../shared/timeout.ts"
import { makeAccessTokenVerifier } from "./accessToken.ts"
import { makeAuthorization, standardOpenIdScopes } from "./authorization.ts"
import { makeClients, matchesRedirect, MetadataConfiguration, type MetadataOptions } from "./clients.ts"
import { ConsentRenderer, escapeHtml, OpenIdConsent } from "./consent.ts"
import {
  type Access,
  AssertionAlgorithms,
  Authentication,
  Authorization,
  AuthorizationMetadata,
  BearerToken,
  Client,
  ConfigurationError,
  CurrentAccess,
  InvalidToken,
  makeAccessSchema,
  makeScopesSchema,
  maximumClientAssertionLength,
  OpenIdMetadata,
  OpenIdProfile,
  Persistence,
  Random,
  type Record,
  reject,
  ResourceMetadata,
  Text,
  TokenResponse,
  Unavailable,
  Url,
  UserInfo
} from "./models.ts"
import { type IdentitySigningKeys, makeIdentityTokens, scopedProfile } from "./openid.ts"

const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis))

const noStore = {
  "cache-control": "no-store",
  pragma: "no-cache",
  "referrer-policy": "no-referrer"
}

const json = (value: Schema.Json, status = 200) => Response.json(value, { status, headers: noStore })

const redirect = (location: string) => new Response(null, { status: 303, headers: { ...noStore, location } })

const LoginPath = Text.check(Schema.isPattern(/^\/(?!\/)[^?#\\\s]*$/))

const AuthorizationCallback = Schema.Struct({
  client_id: Text,
  redirect_uri: Schema.optionalKey(Url),
  state: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

const AuthorizeQuery = Schema.Struct({
  ...AuthorizationCallback.fields,
  response_type: Schema.Literal("code"),
  resource: Schema.optionalKey(Url),
  scope: Text,
  code_challenge: Random,
  code_challenge_method: Schema.Literal("S256"),
  nonce: Schema.optionalKey(Text),
  prompt: Schema.optionalKey(Schema.Literals(["none", "login", "consent", "select_account"])),
  max_age: Schema.optionalKey(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
  ),
  state: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

const TokenRequest = Schema.Union([
  Schema.Struct({
    grant_type: Schema.Literal("authorization_code"),
    client_id: Text,
    resource: Schema.optionalKey(Url),
    code: Text,
    redirect_uri: Schema.optionalKey(Url),
    code_verifier: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._~-]{43,128}$/))
  }),
  Schema.Struct({
    grant_type: Schema.Literal("refresh_token"),
    client_id: Text,
    resource: Schema.optionalKey(Url),
    refresh_token: Text,
    scope: Schema.optionalKey(Text)
  })
])

const Decision = Schema.Struct({ csrf: Random, decision: Schema.Literals(["approve", "deny"]) })

const Revocation = Schema.Struct({
  client_id: Text,
  token: BearerToken,
  token_type_hint: Schema.optionalKey(Text)
})

const parameters = Effect.fnUntraced(function*(params: URLSearchParams) {
  const entries: { [key: string]: string } = Object.create(null)

  const recognized = new Set([
    "response_type",
    "client_id",
    "redirect_uri",
    "resource",
    "scope",
    "code_challenge",
    "code_challenge_method",
    "state",
    "grant_type",
    "code",
    "code_verifier",
    "refresh_token",
    "csrf",
    "decision",
    "token",
    "token_type_hint",
    "client_secret",
    "client_assertion",
    "client_assertion_type",
    "nonce",
    "prompt",
    "max_age",
    "response_mode",
    "request",
    "request_uri",
    "claims",
    "id_token_hint",
    "acr_values"
  ])

  const seen = new Set<string>()

  for (const [key, value] of params) {
    if (!recognized.has(key)) continue
    if (seen.has(key)) return yield* reject()
    seen.add(key)
    if (value !== "") entries[key] = value
  }

  return entries
})

const maximumFormBytes = 16384

const form = Effect.fnUntraced(function*(request: HttpServerRequest.HttpServerRequest) {
  if (
    request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !==
      "application/x-www-form-urlencoded"
  ) {
    return yield* reject()
  }
  const decoder = new TextDecoder()

  const body = yield* request.stream.pipe(
    Stream.runFoldEffect(
      () => ({ text: "", bytes: 0 }),
      (body, chunk) =>
        body.bytes + chunk.length > maximumFormBytes
          ? Effect.fail(reject())
          : Effect.succeed({
            text: body.text + decoder.decode(chunk, { stream: true }),
            bytes: body.bytes + chunk.length
          })
    ),
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, (error) => error._tag === "OAuthServerRejected" ? error : Unavailable.make({}))
      )
    )
  )

  return yield* parameters(new URLSearchParams(body.text + decoder.decode()))
})

export interface Options {
  /** One authorization server per origin. HTTP is accepted only for loopback development. */
  readonly origin: string
  readonly resource: string
  readonly clients: ReadonlyArray<Client>
  /** Enable public or private_key_jwt CIMD clients from these trusted HTTPS origins. */
  readonly clientMetadata?: MetadataOptions
  /** Login must return to paths.authorize. Pending authorization stays in a private cookie. */
  readonly loginPath: string
  readonly keys: SessionSigningKeyring
}

export interface OpenIdOptions extends Omit<Options, "resource" | "clientMetadata"> {
  readonly identityKeys: IdentitySigningKeys
  /** Explicit audience for application access. Defaults to this server's UserInfo endpoint. */
  readonly resource?: string
  /** JWT access requires an explicit resource. Defaults to opaque access tokens. */
  readonly accessTokenFormat?: "opaque" | "jwt"
  /** Defaults to ten minutes; accepts one second through ten minutes. */
  readonly accessTokenLifetimeMillis?: number
  /** Opt-in, and each client must also register the refresh_token grant type. */
  readonly refreshTokens?: boolean
}

export interface OpenIdIdentity<Scope extends OAuthScope.OAuthScope = OAuthScope.OAuthScope> {
  /** Verify the current browser session. Authentication time must be the actual sign-in time. */
  readonly current: Effect.Effect<
    Authentication | undefined,
    Unavailable,
    HttpServerRequest.HttpServerRequest
  >
  /** Check the same session and account authority at code redemption, refresh and UserInfo. */
  readonly active: (authentication: Authentication) => Effect.Effect<boolean, Unavailable>
  readonly profile: (
    input: Pick<Access<Scope>, "subjectId" | "clientId" | "scopes">
  ) => Effect.Effect<OpenIdProfile, Unavailable>
}

interface ServerIdentity<Scope extends OAuthScope.OAuthScope = OAuthScope.OAuthScope> {
  readonly current: Effect.Effect<
    | {
      readonly subjectId: SubjectId
      readonly authentication?: Authentication
    }
    | undefined,
    Unavailable,
    HttpServerRequest.HttpServerRequest
  >
  readonly openId?: Omit<OpenIdIdentity<Scope>, "current">
}

/** One grant state machine serves OAuth and opt-in OpenID authentication. */
const makeServer = <
  const Id extends string,
  const S extends ReadonlyArray<OAuthScope.OAuthScope>,
  R
>(
  id: Id,
  input: { readonly scopes: S },
  identitySource: Effect.Effect<ServerIdentity<NoInfer<S[number]>>, never, R>
) => {
  type Scope = S[number]
  const scopes = [...new Set<Scope>(input.scopes)]
  const ScopeSchema = Schema.Literals(scopes)
  const ScopesSchema = makeScopesSchema<Scope>(ScopeSchema)
  const AccessSchema = makeAccessSchema<Scope>(ScopeSchema)
  const authorizationSource = makeAuthorization<Id, Scope>(id, ScopeSchema)

  const ScopedCurrentAccess = Context.Reference<Access<Scope> | undefined>(
    `@effect/auth/OAuthServer/${id}/CurrentAccess/${JSON.stringify([...scopes].sort())}`,
    { defaultValue: () => undefined }
  )

  const scopeList = (text: string) =>
    Schema.decodeUnknownEffect(ScopesSchema)([...new Set(text.split(" "))]).pipe(
      Effect.mapError(() => reject("invalid_scope"))
    )

  const paths = {
    authorize: `/oauth/${id}/authorize`,
    token: `/oauth/${id}/token`,
    revoke: `/oauth/${id}/revoke`,
    metadata: "/.well-known/oauth-authorization-server",
    openIdMetadata: "/.well-known/openid-configuration",
    jwks: `/oauth/${id}/jwks`,
    userInfo: `/oauth/${id}/userinfo`
  } as const

  const Service = Context.Service<
    { readonly server: Id; readonly kind: "server"; readonly scopes: Types.Invariant<Scope> },
    {
      readonly handle: (request: Request) => Effect.Effect<Response>
      readonly verify: (
        token: Redacted.Redacted<string>
      ) => Effect.Effect<Access<Scope>, InvalidToken | Unavailable>
      /** Trusted application operation, e.g. disabling an account or connection. */
      readonly revoke: (grantId: string) => Effect.Effect<void, Unavailable>
      readonly resource: string
      readonly resourceMetadata: string
      /** Exact name for this configured origin, including the HTTPS host prefix. */
      readonly cookieName: string
    }
  >()(`@effect/auth/OAuthServer/${id}`)

  const layer = (
    options:
      & Options
      & Partial<
        Pick<
          OpenIdOptions,
          "identityKeys" | "accessTokenFormat" | "accessTokenLifetimeMillis" | "refreshTokens"
        >
      >
  ) =>
    Layer.effect(
      Service,
      Effect.gen(function*() {
        const config = yield* Schema.decodeUnknownEffect(
          Schema.Struct({
            id: Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{0,47}$/)),
            origin: Origin.check(Schema.isMaxLength(256)),
            resource: Url.check(Schema.isMaxLength(512)),
            clients: Schema.Array(Client),
            clientMetadata: Schema.optionalKey(MetadataConfiguration),
            loginPath: LoginPath,
            scopes: ScopesSchema,
            accessTokenFormat: Schema.Literals(["opaque", "jwt"]),
            accessTokenLifetimeMillis: Schema.Int.check(
              Schema.isBetween({ minimum: 1000, maximum: 600000 })
            ),
            refreshTokens: Schema.Boolean
          })
        )({
          ...options,
          id,
          scopes,
          accessTokenFormat: options.accessTokenFormat ?? "opaque",
          accessTokenLifetimeMillis: options.accessTokenLifetimeMillis ?? 600_000,
          refreshTokens: options.refreshTokens ?? false,
          clients: options.clients.map((client) => ({
            ...client,
            redirectUris: [...client.redirectUris]
          }))
        }).pipe(Effect.mapError(() => ConfigurationError.make({})))

        const secure = config.origin.startsWith("https:")
        const cookieName = `${secure ? "__Host-" : ""}yielded-${id}-consent`
        const resourceUrl = new URL(config.resource)

        if (
          (resourceUrl.pathname !== "/" && resourceUrl.href !== config.resource) ||
          (options.identityKeys === undefined && resourceUrl.origin !== config.origin) ||
          resourceUrl.search ||
          (config.clients.length === 0 && config.clientMetadata === undefined) ||
          config.loginPath === paths.authorize ||
          new Set(config.clients.map((client) => client.clientId)).size !== config.clients.length
        ) {
          return yield* ConfigurationError.make({})
        }

        const clients = yield* makeClients(
          config.clients,
          config.clientMetadata,
          config.origin,
          `${config.origin}${paths.token}`
        )

        const store = yield* Persistence

        const consentRenderer = Option.getOrElse(
          yield* Effect.serviceOption(ConsentRenderer),
          () => ConsentRenderer.default
        )

        const openIdConsent = Option.getOrElse(
          yield* Effect.serviceOption(OpenIdConsent),
          () => OpenIdConsent.default
        )

        const authorization = Option.getOrElse(
          yield* Effect.serviceOption(authorizationSource.Service),
          () => authorizationSource.default
        )

        const identity = yield* identitySource

        if ((identity.openId === undefined) !== (options.identityKeys === undefined)) {
          return yield* ConfigurationError.make({})
        }

        const openId = options.identityKeys === undefined
          ? undefined
          : yield* makeIdentityTokens(options.identityKeys)

        const jwtAccess = openId !== undefined && config.accessTokenFormat === "jwt"
          ? yield* makeAccessTokenVerifier({
            issuer: config.origin,
            resource: config.resource,
            publicKeys: openId.jwks.keys,
            scopes
          })
          : undefined

        if (
          openId !== undefined &&
          (config.clientMetadata !== undefined ||
            !config.scopes.some((scope) => scope === "openid"))
        ) {
          return yield* ConfigurationError.make({})
        }
        const randomService = yield* SecureRandom.SecureRandom
        const digestService = yield* Digest.Digest
        const namespace = `${config.origin}/oauth/${id}`
        const resourceMetadataPath = `/.well-known/oauth-protected-resource${
          resourceUrl.pathname === "/" ? "" : resourceUrl.pathname
        }`
        const resourceMetadata = `${config.origin}${resourceMetadataPath}`

        const Envelope = Schema.Struct({
          purpose: Schema.Literal("oauth-server/v1"),
          issuer: Schema.Literal(config.origin),
          server: Schema.Literal(id),
          resource: Schema.Literal(config.resource),
          kind: Schema.Literals(["consent", "code", "access", "refresh"]),
          grantId: Random,
          version: Random,
          expiresAtMillis: Schema.Natural
        })

        type Envelope = typeof Envelope.Type

        const codec = yield* makeSessionSigningCodec(Envelope, options.keys, 2048).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => ConfigurationError.make({}))))
        )

        const random = randomService.randomBytes(32).pipe(
          Effect.map(Base64Url.encode),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
        )

        const encode = (
          kind: Envelope["kind"],
          grantId: string,
          version: string,
          expiresAtMillis: number
        ) =>
          codec
            .encode({
              purpose: "oauth-server/v1",
              issuer: config.origin,
              server: id,
              resource: config.resource,
              kind,
              grantId,
              version,
              expiresAtMillis
            })
            .pipe(
              Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
            )

        const decode = Effect.fnUntraced(function*(token: Redacted.Redacted<string>) {
          const value = yield* codec
            .decode(token)
            .pipe(
              Effect.catchCause((cause) =>
                Effect.failCause(
                  Cause.map(
                    cause,
                    (error) => error._tag === "SessionInvalid" ? InvalidToken.make({}) : Unavailable.make({})
                  )
                )
              )
            )

          if (value.expiresAtMillis <= (yield* now)) return yield* InvalidToken.make({})

          return value
        })

        const decodeAccess = Effect.fnUntraced(function*(credential: Redacted.Redacted<string>) {
          if (jwtAccess === undefined) return yield* decode(credential)
          const { claims } = yield* jwtAccess.decode(credential)

          return Envelope.make({
            purpose: "oauth-server/v1",
            issuer: config.origin,
            server: id,
            resource: config.resource,
            kind: "access",
            grantId: claims.grant_id,
            version: claims.jti,
            expiresAtMillis: claims.exp * 1000
          })
        })

        const clientFor = clients.resolve

        const validGrant = Effect.fnUntraced(function*(record: Record) {
          const client = yield* clientFor(record.authorization.clientId).pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) => error._tag === "OAuthServerRejected" ? InvalidToken.make({}) : error)
              )
            )
          )

          return (
            matchesRedirect(client, record.authorization.redirectUri) &&
            record.authorization.scopes.every(Schema.is(ScopeSchema)) &&
            (identity.openId === undefined ||
              (record.status !== "Code" && record.status !== "Active") ||
              (record.authentication !== undefined &&
                record.authentication.expiresAtMillis > (yield* now) &&
                (yield* identity.openId.active(record.authentication))))
          )
        })

        const read = Effect.fnUntraced(function*(token: Envelope) {
          const record = yield* store.get(namespace, token.grantId)

          if (
            !record ||
            record.status === "Revoked" ||
            record.expiresAtMillis <= (yield* now) ||
            !(yield* validGrant(record))
          ) {
            return yield* InvalidToken.make({})
          }

          return record
        })

        const commit = Effect.fnUntraced(function*(
          grantId: string,
          before: Record,
          after: Record
        ) {
          if (!(yield* store.compareAndSet(namespace, grantId, before.version, after))) {
            return yield* reject("invalid_grant")
          }
        })

        const approve = Effect.fnUntraced(function*(
          grantId: string,
          before: Record,
          next: Record
        ) {
          const approved: Record = {
            ...next,
            status: "Code",
            version: yield* random,
            expiresAtMillis: (yield* now) + 60_000
          }

          const code = yield* encode("code", grantId, approved.version, approved.expiresAtMillis)

          yield* commit(grantId, before, approved)

          return callback(approved.authorization, { code: Redacted.value(code) })
        })

        const cookie = (credential: string, maxAge: number) =>
          Cookies.serializeCookie(
            Cookies.makeCookieUnsafe(cookieName, credential, {
              path: secure ? "/" : paths.authorize,
              httpOnly: true,
              sameSite: "lax",
              secure,
              maxAge: Duration.seconds(maxAge)
            })
          )

        const callback = (
          authorization: Pick<Authorization, "redirectUri" | "state">,
          values: { code: string } | { error: string }
        ) => {
          const url = new URL(authorization.redirectUri)

          for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
          url.searchParams.set("iss", config.origin)
          if (authorization.state !== undefined) url.searchParams.set("state", authorization.state)
          const response = redirect(url.href)

          response.headers.set("set-cookie", cookie("", 0))

          return response
        }

        const verify = Effect.fn("OAuthServer.verify")(function*(
          credential: Redacted.Redacted<string>
        ) {
          const token = yield* decodeAccess(credential)

          if (token.kind !== "access") return yield* InvalidToken.make({})
          const record = yield* read(token)

          if (
            record.status !== "Active" ||
            record.version !== token.version ||
            record.subjectId === undefined
          ) {
            return yield* InvalidToken.make({})
          }

          return yield* Schema.decodeEffect(AccessSchema)({
            subjectId: record.subjectId,
            grantId: token.grantId,
            clientId: record.authorization.clientId,
            resource: config.resource,
            scopes: record.authorization.scopes,
            ...(record.claims === undefined ? {} : { claims: record.claims })
          }).pipe(Effect.mapError(() => InvalidToken.make({})))
        })

        const handle = Effect.fn("OAuthServer.handle")(
          function*(web: Request) {
            const url = new URL(web.url)

            if (url.origin !== config.origin) return json({ error: "invalid_request" }, 400)
            const request = HttpServerRequest.fromWeb(web)

            if (openId !== undefined && web.method === "GET" && url.pathname === paths.jwks) {
              return json({ keys: [...openId.jwks.keys] })
            }
            if (
              openId !== undefined &&
              web.method === "GET" &&
              url.pathname === paths.openIdMetadata
            ) {
              return json(
                OpenIdMetadata.make({
                  issuer: config.origin,
                  authorization_endpoint: `${config.origin}${paths.authorize}`,
                  token_endpoint: `${config.origin}${paths.token}`,
                  ...(config.resource === `${config.origin}${paths.userInfo}`
                    ? { userinfo_endpoint: `${config.origin}${paths.userInfo}` }
                    : {}),
                  jwks_uri: `${config.origin}${paths.jwks}`,
                  revocation_endpoint: `${config.origin}${paths.revoke}`,
                  response_types_supported: ["code"],
                  response_modes_supported: ["query"],
                  grant_types_supported: config.refreshTokens
                    ? ["authorization_code", "refresh_token"]
                    : ["authorization_code"],
                  subject_types_supported: ["public"],
                  id_token_signing_alg_values_supported: ["RS256"],
                  token_endpoint_auth_methods_supported: [
                    "none",
                    "client_secret_basic",
                    "client_secret_post",
                    "private_key_jwt"
                  ],
                  token_endpoint_auth_signing_alg_values_supported: AssertionAlgorithms,
                  code_challenge_methods_supported: ["S256"],
                  authorization_response_iss_parameter_supported: true,
                  scopes_supported: config.scopes,
                  claims_supported: [
                    "iss",
                    "sub",
                    "aud",
                    "exp",
                    "iat",
                    "auth_time",
                    "sid",
                    "nonce",
                    ...Object.keys(OpenIdProfile.fields)
                  ],
                  claims_parameter_supported: false,
                  request_parameter_supported: false,
                  request_uri_parameter_supported: false
                })
              )
            }
            if (
              openId !== undefined &&
              identity.openId !== undefined &&
              (web.method === "GET" || web.method === "POST") &&
              url.pathname === paths.userInfo
            ) {
              const authorization = web.headers.get("authorization")

              if (
                config.resource !== `${config.origin}${paths.userInfo}` ||
                authorization === null ||
                !/^Bearer /i.test(authorization)
              ) {
                return new Response(null, {
                  status: 401,
                  headers: { ...noStore, "www-authenticate": "Bearer realm=\"userinfo\"" }
                })
              }

              const access = yield* verify(Redacted.make(authorization.slice(7))).pipe(Effect.exit)

              if (access._tag === "Failure") {
                if (
                  !access.cause.reasons.every(
                    (reason) => Cause.isFailReason(reason) && reason.error._tag === "OAuthServerInvalidToken"
                  )
                ) {
                  return yield* Effect.failCause(access.cause)
                }

                return new Response(null, {
                  status: 401,
                  headers: { ...noStore, "www-authenticate": "Bearer error=\"invalid_token\"" }
                })
              }

              const profile = yield* identity.openId.profile(access.value).pipe(
                Effect.flatMap(Schema.decodeEffect(OpenIdProfile)),
                Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
              )

              return json(
                UserInfo.make({
                  sub: access.value.subjectId,
                  ...scopedProfile(profile, access.value.scopes)
                })
              )
            }

            if (web.method === "GET" && url.pathname === paths.metadata) {
              return json(
                AuthorizationMetadata.make({
                  issuer: config.origin,
                  authorization_endpoint: `${config.origin}${paths.authorize}`,
                  token_endpoint: `${config.origin}${paths.token}`,
                  revocation_endpoint: `${config.origin}${paths.revoke}`,
                  response_types_supported: ["code"],
                  grant_types_supported: openId === undefined || config.refreshTokens
                    ? ["authorization_code", "refresh_token"]
                    : ["authorization_code"],
                  token_endpoint_auth_methods_supported: [
                    "none",
                    "client_secret_basic",
                    "client_secret_post",
                    "private_key_jwt"
                  ],
                  token_endpoint_auth_signing_alg_values_supported: AssertionAlgorithms,
                  revocation_endpoint_auth_methods_supported: [
                    "none",
                    "client_secret_basic",
                    "client_secret_post",
                    "private_key_jwt"
                  ],
                  revocation_endpoint_auth_signing_alg_values_supported: AssertionAlgorithms,
                  code_challenge_methods_supported: ["S256"],
                  authorization_response_iss_parameter_supported: true,
                  client_id_metadata_document_supported: config.clientMetadata !== undefined,
                  scopes_supported: config.scopes
                })
              )
            }
            if (web.method === "GET" && url.pathname === resourceMetadataPath) {
              return json(
                ResourceMetadata.make({
                  resource: config.resource,
                  authorization_servers: [config.origin],
                  scopes_supported: config.scopes,
                  bearer_methods_supported: ["header"]
                })
              )
            }
            if (
              url.pathname === paths.authorize &&
              (web.method === "GET" || web.method === "POST")
            ) {
              if (web.method === "GET" && url.search !== "") {
                const params = yield* parameters(url.searchParams)

                const target = yield* Schema.decodeUnknownEffect(AuthorizationCallback)(
                  params
                ).pipe(Effect.mapError(() => reject()))

                const client = yield* clientFor(target.client_id)

                const redirectUri = target.redirect_uri ??
                  (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined)

                if (redirectUri === undefined || !matchesRedirect(client, redirectUri)) {
                  return yield* reject()
                }

                const validation = yield* Effect.gen(function*() {
                  if (params.response_type !== undefined && params.response_type !== "code") {
                    return yield* reject("unsupported_response_type")
                  }
                  if (params.scope === undefined) return yield* reject("invalid_scope")

                  const query = yield* Schema.decodeUnknownEffect(AuthorizeQuery)(params).pipe(
                    Effect.mapError(() => reject())
                  )

                  if (
                    (query.resource ?? (openId === undefined ? undefined : config.resource)) !==
                      config.resource
                  ) {
                    return yield* reject("invalid_target")
                  }
                  if (
                    openId !== undefined &&
                    ((params.response_mode !== undefined && params.response_mode !== "query") ||
                      ["request", "request_uri", "claims", "id_token_hint", "acr_values"].some(
                        (key) => params[key] !== undefined
                      ))
                  ) {
                    return yield* reject()
                  }
                  if (
                    openId === undefined &&
                    (query.nonce !== undefined ||
                      query.prompt !== undefined ||
                      query.max_age !== undefined)
                  ) {
                    return yield* reject()
                  }
                  if (
                    client.grantTypes !== undefined &&
                    !client.grantTypes.includes("authorization_code")
                  ) {
                    return yield* reject("unauthorized_client")
                  }
                  const requested = yield* scopeList(query.scope)

                  if (openId !== undefined && !requested.some((scope) => scope === "openid")) {
                    return yield* reject("invalid_scope")
                  }

                  return { query, requested }
                }).pipe(Effect.result)

                if (Result.isFailure(validation)) {
                  const subject = yield* identity.current.pipe(
                    Effect.provideService(HttpServerRequest.HttpServerRequest, request)
                  )

                  if (subject === undefined) return json({ error: validation.failure.error }, 400)
                  yield* Schema.decodeEffect(SubjectId)(subject.subjectId).pipe(
                    Effect.mapError(() => Unavailable.make({}))
                  )

                  const response = callback(
                    { redirectUri, ...(target.state === undefined ? {} : { state: target.state }) },
                    { error: validation.failure.error }
                  )

                  // Static registrations and same-origin metadata callbacks are trusted.
                  // Other registered callbacks require an explicit navigation decision.
                  if (
                    config.clients.some((entry) => entry.clientId === client.clientId) ||
                    new URL(redirectUri).origin === new URL(client.clientId).origin
                  ) {
                    return response
                  }

                  return new Response(
                    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Authorization failed</title><main><h1>Authorization failed</h1><p>${
                      escapeHtml(validation.failure.error)
                    }</p><a href="${escapeHtml(response.headers.get("location") ?? "")}">Return to ${
                      escapeHtml(new URL(redirectUri).host)
                    }</a></main></html>`,
                    {
                      status: 400,
                      headers: {
                        ...noStore,
                        "content-type": "text/html; charset=utf-8",
                        "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                      }
                    }
                  )
                }
                const { query, requested } = validation.success
                const grantId = yield* random
                const version = yield* random
                const expiresAtMillis = (yield* now) + 300_000

                const authorization = Authorization.make({
                  clientId: client.clientId,
                  redirectUri,
                  scopes: requested,
                  challenge: query.code_challenge,
                  ...(query.nonce === undefined ? {} : { nonce: query.nonce }),
                  ...(query.prompt === undefined ? {} : { prompt: query.prompt }),
                  ...(query.max_age === undefined ? {} : { maxAgeSeconds: query.max_age }),
                  ...(openId === undefined ? {} : { requestedAtMillis: yield* now }),
                  ...(query.state === undefined ? {} : { state: query.state })
                })

                const credential = yield* encode("consent", grantId, version, expiresAtMillis)

                if (
                  !(yield* store.insert(namespace, grantId, {
                    status: "Pending",
                    version,
                    authorization,
                    expiresAtMillis
                  }))
                ) {
                  return yield* Unavailable.make({})
                }
                const response = redirect(paths.authorize)

                response.headers.set("set-cookie", cookie(Redacted.value(credential), 300))

                return response
              }
              const credential = request.cookies[cookieName]

              if (credential === undefined) return yield* reject()
              const token = yield* decode(Redacted.make(credential))
              let record = yield* read(token)

              if (
                token.kind !== "consent" ||
                (record.status !== "Pending" && record.status !== "Consent")
              ) {
                return yield* reject()
              }

              const current = yield* identity.current.pipe(
                Effect.provideService(HttpServerRequest.HttpServerRequest, request)
              )

              const authorization = record.authorization
              const authentication = current?.authentication

              const stale = openId !== undefined &&
                (authentication === undefined ||
                  (authorization.prompt === "login" &&
                    authentication.authenticatedAtMillis <
                      (authorization.requestedAtMillis ?? Infinity)) ||
                  (authorization.maxAgeSeconds !== undefined &&
                    authentication.authenticatedAtMillis <
                      (authorization.requestedAtMillis ?? Infinity) -
                        authorization.maxAgeSeconds * 1000))

              if (current === undefined || stale) {
                if (authorization.prompt === "none") {
                  return callback(authorization, { error: "login_required" })
                }

                return web.method === "GET"
                  ? redirect(config.loginPath)
                  : yield* reject("access_denied")
              }
              const subjectId = current.subjectId

              if (openId !== undefined) {
                if (authentication === undefined) return yield* Unavailable.make({})

                const verified = yield* Schema.decodeEffect(Authentication)(authentication).pipe(
                  Effect.mapError(() => Unavailable.make({}))
                )

                const time = yield* now

                if (
                  verified.subjectId !== subjectId ||
                  verified.authenticatedAtMillis > time ||
                  verified.expiresAtMillis <= time
                ) {
                  return yield* Unavailable.make({})
                }
              }
              if (
                web.method === "GET" &&
                openId !== undefined &&
                authentication !== undefined &&
                authorization.prompt !== "consent" &&
                authorization.prompt !== "select_account" &&
                (yield* openIdConsent.approved({
                  clientId: authorization.clientId,
                  redirectUri: authorization.redirectUri,
                  scopes: authorization.scopes,
                  authentication
                }))
              ) {
                return yield* approve(token.grantId, record, {
                  ...record,
                  subjectId,
                  authentication
                })
              }
              if (authorization.prompt === "none") {
                return callback(authorization, { error: "consent_required" })
              }
              yield* Schema.decodeEffect(SubjectId)(subjectId).pipe(
                Effect.mapError(() => Unavailable.make({}))
              )
              if (web.method === "GET") {
                if (
                  record.subjectId !== subjectId ||
                  record.authentication?.sessionId !== authentication?.sessionId
                ) {
                  const next: Record = {
                    ...record,
                    status: "Consent",
                    subjectId,
                    ...(authentication === undefined ? {} : { authentication }),
                    version: yield* random
                  }

                  yield* commit(token.grantId, record, next)
                  record = next
                }
                const client = yield* clientFor(record.authorization.clientId)

                return new Response(
                  yield* consentRenderer.render({
                    clientName: client.name,
                    clientId: client.clientId,
                    registered: config.clients.some((value) => value.clientId === client.clientId),
                    subjectId,
                    resource: config.resource,
                    scopes: record.authorization.scopes,
                    redirectUri: record.authorization.redirectUri,
                    action: paths.authorize,
                    loginPath: config.loginPath,
                    csrf: record.version
                  }),
                  {
                    headers: {
                      ...noStore,
                      "content-type": "text/html; charset=utf-8",
                      // Native form navigation needs its same-origin Origin header.
                      // The clean consent URL carries no authorization parameters.
                      "referrer-policy": "same-origin",
                      // Browsers also apply form-action to the post-consent redirect.
                      "content-security-policy":
                        `default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; form-action 'self' ${
                          new URL(record.authorization.redirectUri).origin
                        }; frame-ancestors 'none'; base-uri 'none'`,
                      "x-frame-options": "DENY",
                      "x-content-type-options": "nosniff"
                    }
                  }
                )
              }
              if (
                web.headers.get("origin") !== config.origin ||
                record.status !== "Consent" ||
                record.subjectId !== subjectId ||
                record.authentication?.sessionId !== authentication?.sessionId
              ) {
                return yield* reject("access_denied")
              }

              const decision = yield* form(request).pipe(
                Effect.flatMap(Schema.decodeUnknownEffect(Decision)),
                Effect.mapError(() => reject())
              )

              // An account switch invalidates forms rendered for the previous subject.
              if (decision.csrf !== record.version) return yield* reject("access_denied")
              if (decision.decision === "deny") {
                yield* store.revoke(namespace, token.grantId)

                return callback(record.authorization, { error: "access_denied" })
              }

              return yield* approve(token.grantId, record, record)
            }
            if (web.method === "POST" && url.pathname === paths.token) {
              const body = yield* form(request)

              const client = yield* clients.authenticate(
                body,
                web.headers.get("authorization"),
                `${config.origin}${paths.token}`
              )

              if (
                (openId !== undefined &&
                  !config.refreshTokens &&
                  body.grant_type !== "authorization_code") ||
                (body.grant_type !== "authorization_code" && body.grant_type !== "refresh_token")
              ) {
                return yield* reject("unsupported_grant_type")
              }

              const query = yield* Schema.decodeUnknownEffect(TokenRequest)({
                ...body,
                client_id: client.clientId
              }).pipe(Effect.mapError(() => reject()))

              if (client.grantTypes !== undefined && !client.grantTypes.includes(query.grant_type)) {
                return yield* reject("unauthorized_client")
              }
              if (
                openId !== undefined &&
                query.grant_type === "refresh_token" &&
                !client.grantTypes?.includes("refresh_token")
              ) {
                return yield* reject("unauthorized_client")
              }
              if (
                (query.resource ?? (openId === undefined ? undefined : config.resource)) !==
                  config.resource
              ) {
                return yield* reject("invalid_target")
              }

              const token = yield* decode(
                Redacted.make(
                  query.grant_type === "authorization_code" ? query.code : query.refresh_token
                )
              )

              const expected = query.grant_type === "authorization_code" ? "code" : "refresh"

              if (token.kind !== expected) return yield* reject("invalid_grant")
              const record = yield* read(token)

              if (
                record.authorization.clientId !== query.client_id ||
                record.subjectId === undefined
              ) {
                return yield* reject("invalid_grant")
              }
              if (query.grant_type === "authorization_code") {
                const digest = yield* digestService
                  .digest(Digest.sha256, new TextEncoder().encode(query.code_verifier))
                  .pipe(
                    Effect.map(Base64Url.encode),
                    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
                  )

                if (
                  ((openId !== undefined || query.redirect_uri !== undefined) &&
                    query.redirect_uri !== record.authorization.redirectUri) ||
                  digest !== record.authorization.challenge
                ) {
                  return yield* reject("invalid_grant")
                }
              }
              if (
                record.version !== token.version ||
                record.status !== (expected === "code" ? "Code" : "Active")
              ) {
                // A valid consumed credential identifies a compromised grant family.
                yield* store.revoke(namespace, token.grantId)

                return yield* reject("invalid_grant")
              }

              const requested = query.grant_type === "refresh_token" && query.scope !== undefined
                ? yield* scopeList(query.scope)
                : yield* scopeList(record.authorization.scopes.join(" "))

              if (!requested.every((scope) => record.authorization.scopes.includes(scope))) {
                return yield* reject("invalid_scope")
              }

              const authorized = openId === undefined
                ? { scopes: requested }
                : yield* Effect.gen(function*() {
                  if (record.authentication === undefined) {
                    return yield* reject("invalid_grant")
                  }

                  const decision = yield* authorization
                    .authorize({
                      authentication: record.authentication,
                      clientId: record.authorization.clientId,
                      resource: config.resource,
                      scopes: requested,
                      grantType: query.grant_type
                    })
                    .pipe(
                      Effect.flatMap(Schema.decodeEffect(authorizationSource.Result)),
                      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Unavailable.make({}))))
                    )

                  if (
                    new Set(decision.scopes).size !== decision.scopes.length ||
                    !decision.scopes.every((scope) => requested.includes(scope))
                  ) {
                    return yield* Unavailable.make({})
                  }
                  const [first, ...remaining] = decision.scopes

                  if (
                    first === undefined ||
                    !decision.scopes.some((scope) => scope === "openid")
                  ) {
                    return yield* reject("access_denied")
                  }

                  return {
                    ...decision,
                    scopes: [first, ...remaining] satisfies readonly [Scope, ...Array<Scope>]
                  }
                })

              const granted = authorized.scopes
              const time = yield* now

              const refreshEnabled = openId === undefined ||
                (config.refreshTokens && client.grantTypes?.includes("refresh_token") === true)

              const next: Record = {
                status: "Active",
                version: yield* random,
                authorization: { ...record.authorization, scopes: granted },
                subjectId: record.subjectId,
                ...(record.authentication === undefined
                  ? {}
                  : { authentication: record.authentication }),
                ...("claims" in authorized && authorized.claims !== undefined
                  ? { claims: authorized.claims }
                  : {}),
                expiresAtMillis: expected === "code"
                  ? Math.min(
                    time + (refreshEnabled ? 30 * 86400_000 : config.accessTokenLifetimeMillis),
                    record.authentication?.expiresAtMillis ?? Infinity
                  )
                  : record.expiresAtMillis
              }

              const accessExpiry = Math.min(
                time + config.accessTokenLifetimeMillis,
                next.expiresAtMillis,
                record.authentication?.expiresAtMillis ?? Infinity
              )

              if (accessExpiry <= time) return yield* reject("invalid_grant")

              const access = openId !== undefined &&
                  jwtAccess !== undefined &&
                  record.authentication !== undefined
                ? yield* openId.issueAccess({
                  iss: config.origin,
                  sub: record.subjectId,
                  aud: config.resource,
                  iat: Math.floor(time / 1000),
                  exp: Math.floor(accessExpiry / 1000),
                  jti: next.version,
                  grant_id: token.grantId,
                  client_id: record.authorization.clientId,
                  scope: granted.join(" "),
                  auth_time: Math.floor(record.authentication.authenticatedAtMillis / 1000),
                  sid: record.authentication.sessionId,
                  ...(next.claims === undefined ? {} : { claims: next.claims })
                })
                : yield* encode("access", token.grantId, next.version, accessExpiry)

              if (!Schema.is(BearerToken)(Redacted.value(access))) {
                return yield* Unavailable.make({})
              }

              // Reserve client authentication and a standard hint for revocation.
              // Fresh assertions may differ from the exchange's assertion in size.
              const revocation = new URLSearchParams({
                token: Redacted.value(access),
                token_type_hint: "access_token"
              })

              for (
                const name of [
                  "client_id",
                  "client_secret",
                  "client_assertion",
                  "client_assertion_type"
                ]
              ) {
                const value = body[name]

                if (value !== undefined) {
                  revocation.set(
                    name,
                    name === "client_assertion" ? "x".repeat(maximumClientAssertionLength) : value
                  )
                }
              }
              if (revocation.toString().length > maximumFormBytes) {
                return yield* Unavailable.make({})
              }

              const refresh = refreshEnabled
                ? yield* encode("refresh", token.grantId, next.version, next.expiresAtMillis)
                : undefined

              let idToken: Redacted.Redacted<string> | undefined

              if (openId !== undefined && identity.openId !== undefined) {
                if (record.authentication === undefined) return yield* reject("invalid_grant")

                const profile = yield* identity.openId.profile({
                  subjectId: record.subjectId,
                  clientId: record.authorization.clientId,
                  scopes: granted
                })

                idToken = yield* openId.issue({
                  issuer: config.origin,
                  clientId: record.authorization.clientId,
                  authentication: record.authentication,
                  ...(record.authorization.nonce === undefined
                    ? {}
                    : { nonce: record.authorization.nonce }),
                  profile,
                  scopes: granted,
                  nowMillis: time
                })
              }

              // Sign locally before the only commit; deliver credentials only after confirmation.
              yield* commit(token.grantId, record, next).pipe(
                Effect.catchCause((cause) =>
                  Effect.gen(function*() {
                    if (
                      !cause.reasons.every(
                        (reason) => Cause.isFailReason(reason) && reason.error._tag === "OAuthServerRejected"
                      )
                    ) {
                      return yield* Effect.failCause(cause)
                    }

                    const revoked = yield* Effect.exit(store.revoke(namespace, token.grantId))

                    return yield* Effect.failCause(
                      revoked._tag === "Failure" ? Cause.combine(cause, revoked.cause) : cause
                    )
                  })
                )
              )

              return json(
                TokenResponse.make({
                  access_token: Redacted.value(access),
                  token_type: "Bearer",
                  expires_in: Math.floor((accessExpiry - time) / 1000),
                  ...(refresh === undefined ? {} : { refresh_token: Redacted.value(refresh) }),
                  ...(idToken === undefined ? {} : { id_token: Redacted.value(idToken) }),
                  scope: granted.join(" ")
                })
              )
            }
            if (web.method === "POST" && url.pathname === paths.revoke) {
              const input = yield* form(request)

              const client = yield* clients.authenticate(
                input,
                web.headers.get("authorization"),
                `${config.origin}${paths.revoke}`
              )

              const query = yield* Schema.decodeUnknownEffect(Revocation)({
                ...input,
                client_id: client.clientId
              }).pipe(Effect.mapError(() => reject()))

              const token = yield* decode(Redacted.make(query.token)).pipe(
                Effect.catchCause((cause) =>
                  cause.reasons.every(
                      (reason) => Cause.isFailReason(reason) && reason.error._tag === "OAuthServerInvalidToken"
                    )
                    ? decodeAccess(Redacted.make(query.token))
                    : Effect.failCause(cause)
                ),
                Effect.catchCause((cause) =>
                  cause.reasons.every(
                      (reason) => Cause.isFailReason(reason) && reason.error._tag === "OAuthServerInvalidToken"
                    )
                    ? Effect.void
                    : Effect.failCause(cause)
                )
              )

              if (token && (token.kind === "access" || token.kind === "refresh")) {
                const record = yield* store.get(namespace, token.grantId)

                if (record?.authorization.clientId === query.client_id) {
                  yield* store.revoke(namespace, token.grantId)
                }
              }

              return new Response(null, { status: 200, headers: noStore })
            }

            return new Response(null, { status: 404, headers: noStore })
          },
          (effect, web) =>
            effect.pipe(
              timeoutWithCause("30 seconds"),
              Effect.catchCause((cause) =>
                Effect.gen(function*() {
                  const unexpected = Cause.fromReasons(
                    cause.reasons.filter(
                      (reason) =>
                        Cause.isDieReason(reason) ||
                        (Cause.isFailReason(reason) &&
                          reason.error._tag !== "OAuthServerRejected" &&
                          reason.error._tag !== "OAuthServerInvalidToken")
                    )
                  )

                  yield* reportAuthFailure("http", unexpected)
                  if (Cause.hasInterrupts(cause)) {
                    return yield* Effect.failCause(
                      Cause.fromReasons<never>([
                        ...cause.reasons.filter(Cause.isInterruptReason),
                        ...(unexpected.reasons.length === 0
                          ? []
                          : [Cause.makeDieReason(ReportedOperationDefect.make({}))])
                      ])
                    )
                  }
                  if (unexpected.reasons.length !== 0) {
                    return json({ error: "temporarily_unavailable" }, 503)
                  }

                  for (const reason of cause.reasons) {
                    if (!Cause.isFailReason(reason) || reason.error._tag !== "OAuthServerRejected") {
                      continue
                    }
                    const { error } = reason.error

                    const response = json(
                      { error },
                      error === "invalid_client" && web.headers.has("authorization") ? 401 : 400
                    )

                    if (response.status === 401) {
                      response.headers.set("www-authenticate", "Basic realm=\"oauth\"")
                    }

                    return response
                  }

                  return json({ error: "invalid_grant" }, 400)
                })
              )
            )
        )

        return Service.of({
          handle,
          verify,
          revoke: (grantId) => store.revoke(namespace, grantId),
          resource: config.resource,
          resourceMetadata,
          cookieName
        })
      })
    )

  const routes = Layer.unwrap(
    Effect.gen(function*() {
      const server = yield* Service

      const handler = Effect.gen(function*() {
        const request = yield* HttpServerRequest.HttpServerRequest

        return HttpServerResponse.fromWeb(
          yield* server.handle(yield* HttpServerRequest.toWeb(request))
        )
      })

      const route = (path: `/${string}`) => HttpRouter.add("*", path, handler)

      return Layer.mergeAll(
        route(paths.authorize),
        route(paths.token),
        route(paths.revoke),
        route(paths.metadata),
        route(paths.openIdMetadata),
        route(paths.jwks),
        route(paths.userInfo),
        route(new URL(server.resourceMetadata).pathname as `/${string}`)
      )
    })
  )

  /** Attach only to protected resource routes; metadata and consent stay public.
   * It does not install, wrap or reimplement an MCP protocol server.
   */
  const middleware = (requiredScopes: ReadonlyArray<Scope>) =>
    HttpRouter.middleware(
      Effect.gen(function*() {
        const server = yield* Service

        if (!requiredScopes.every((scope) => scopes.includes(scope))) {
          return yield* ConfigurationError.make({})
        }

        const challenge = (error?: "invalid_token" | "insufficient_scope") =>
          `Bearer resource_metadata="${server.resourceMetadata}", scope="${requiredScopes.join(" ")}"${
            error ? `, error="${error}"` : ""
          }`

        return (httpEffect) =>
          Effect.gen(function*() {
            const credential = yield* HttpApiBuilder.securityDecode(HttpApiSecurity.bearer)

            if (Redacted.value(credential) === "") {
              return HttpServerResponse.empty({
                status: 401,
                headers: { ...noStore, "www-authenticate": challenge() }
              })
            }

            const verified = yield* server
              .verify(credential)
              .pipe(timeoutWithCause("30 seconds"), Effect.exit)

            if (verified._tag === "Failure") {
              const unexpected = Cause.fromReasons(
                verified.cause.reasons.filter(
                  (reason) =>
                    Cause.isDieReason(reason) ||
                    (Cause.isFailReason(reason) && reason.error._tag !== "OAuthServerInvalidToken")
                )
              )

              yield* reportAuthFailure("http", unexpected)
              if (Cause.hasInterrupts(verified.cause)) {
                return yield* Effect.failCause(
                  Cause.fromReasons<never>([
                    ...verified.cause.reasons.filter(Cause.isInterruptReason),
                    ...(unexpected.reasons.length === 0
                      ? []
                      : [Cause.makeDieReason(ReportedOperationDefect.make({}))])
                  ])
                )
              }

              return unexpected.reasons.length === 0
                ? HttpServerResponse.empty({
                  status: 401,
                  headers: { ...noStore, "www-authenticate": challenge("invalid_token") }
                })
                : HttpServerResponse.empty({ status: 503, headers: noStore })
            }
            const access = verified.value

            if (!requiredScopes.every((scope) => access.scopes.includes(scope))) {
              return HttpServerResponse.empty({
                status: 403,
                headers: { ...noStore, "www-authenticate": challenge("insufficient_scope") }
              })
            }

            return yield* httpEffect.pipe(
              Effect.provideService(CurrentAccess, access),
              Effect.provideService(ScopedCurrentAccess, access)
            )
          })
      })
    )

  return {
    Service,
    layer,
    routes,
    middleware,
    paths,
    Scope: ScopeSchema,
    Access: AccessSchema,
    CurrentAccess: ScopedCurrentAccess,
    Authorization: authorizationSource.Service
  }
}

/** Authorization-code server for MCP/resource authorization.
 * Declared scopes retain their branded literal types throughout the server.
 */
export const make = <const Id extends string, const S extends ReadonlyArray<OAuthScope.OAuthScope>>(
  id: Id,
  input: { readonly scopes: S }
) => {
  type Scope = S[number]

  const Identity = Context.Service<
    { readonly server: Id; readonly kind: "identity" },
    {
      readonly current: Effect.Effect<
        SubjectId | undefined,
        Unavailable,
        HttpServerRequest.HttpServerRequest
      >
    }
  >()(`@effect/auth/OAuthServer/${id}/Identity`)

  const server = makeServer(
    id,
    input,
    Effect.map(Identity, (identity): ServerIdentity<Scope> => ({
      current: Effect.map(identity.current, (subjectId) => subjectId === undefined ? undefined : { subjectId })
    }))
  )

  return {
    Service: server.Service,
    Scope: server.Scope,
    Access: server.Access,
    CurrentAccess: server.CurrentAccess,
    routes: server.routes,
    middleware: server.middleware,
    paths: server.paths,
    Identity,
    layer: (options: Options) => server.layer(options)
  }
}

/** Registered-client OpenID Connect code flow with PKCE, RS256 and explicit consent.
 * Standard OpenID scopes are included alongside application scopes.
 * Applications own authentication, current session validity and profile disclosure.
 * Resource JWTs and rotating refresh tokens are opt-in; dynamic registration and
 * front/back-channel logout are not enabled.
 */
export const makeOpenId = <
  const Id extends string,
  const S extends ReadonlyArray<OAuthScope.OAuthScope> = readonly []
>(
  id: Id,
  options: { readonly scopes?: S } = {}
) => {
  type OpenIdScope = S[number] | (typeof standardOpenIdScopes)[number]
  const scopes = [...(options.scopes ?? []), ...standardOpenIdScopes]

  const Identity = Context.Service<
    {
      readonly server: Id
      readonly kind: "openid-identity"
      readonly scopes: Types.Invariant<OpenIdScope>
    },
    OpenIdIdentity<OpenIdScope>
  >()(`@effect/auth/OAuthServer/${id}/OpenIdIdentity`)

  const server = makeServer(
    id,
    { scopes },
    Effect.map(Identity, (identity): ServerIdentity<OpenIdScope> => ({
      current: Effect.map(identity.current, (authentication) =>
        authentication === undefined
          ? undefined
          : { subjectId: authentication.subjectId, authentication }),
      openId: identity
    }))
  )

  return {
    ...server,
    Identity,
    layer: (options: OpenIdOptions) =>
      options.accessTokenFormat === "jwt" && options.resource === undefined
        ? Layer.effect(server.Service, Effect.fail(ConfigurationError.make({})))
        : server.layer({
          ...options,
          resource: options.resource ?? `${options.origin}${server.paths.userInfo}`
        })
  }
}
