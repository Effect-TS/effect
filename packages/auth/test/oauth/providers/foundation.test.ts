import { type OAuth, OAuthError, Oidc } from "@effect/auth/oauth"
import * as Provider from "@effect/auth/oauth/providers/internal/provider"
import { assert, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as jose from "jose"

import { codeInput, cryptoLayer, form, metadata, options, tokenBody, transport } from "../fixtures.ts"

const Profile = Schema.Struct({ id: Schema.String })
const plain = {
  client: options,
  redirectUri: codeInput.redirectUri,
  scopes: ["profile"],
  profile: Profile,
  subject: (profile: typeof Profile.Type) => Effect.succeed(profile.id)
}
const oidc = {
  ...plain,
  scopes: ["openid", "profile"],
  subject: (_: typeof Profile.Type, verified: Oidc.Verified) => Effect.succeed(verified.subject)
}
const challenge = "A".repeat(43)
const seconds = 2_000_000_000
const claims = {
  iss: metadata.issuer,
  sub: "verified-subject",
  aud: options.clientId,
  iat: seconds,
  exp: seconds + 300,
  nonce: "nonce",
  email: "verified@example.com"
}

it.effect("requires S256 transaction inputs by default and always requires the OIDC nonce", () =>
  Effect.gen(function*() {
    let requests = 0
    const http = transport(() => {
      requests++
      return Response.json(tokenBody)
    })
    const oauthClient = yield* Provider.makeOAuth(plain).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const oidcClient = yield* Provider.makeOidc(oidc).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const operations: Array<
      Effect.Effect<
        unknown,
        OAuthError.ConfigurationError | OAuthError.Rejected | OAuthError.Unavailable,
        Oidc.VerificationRequirements
      >
    > = [
      oauthClient.authorizationUrl({ state: Redacted.make("state") }),
      oauthClient.exchangeCode({ code: Redacted.make("code") }),
      oidcClient.authorizationUrl({ state: Redacted.make("state"), nonce: Redacted.make("nonce") }),
      oidcClient.exchangeCode({ code: Redacted.make("code"), nonce: Redacted.make("nonce") }),
      oidcClient.authorizationUrl({ state: Redacted.make("state"), codeChallenge: challenge } as never),
      oidcClient.exchangeCode(codeInput as never)
    ]
    for (const operation of operations) {
      const failure = yield* operation.pipe(Effect.flip)
      assert.strictEqual(failure._tag, "OAuthConfigurationError")
    }
    assert.strictEqual(requests, 0)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("captures authorization secrets before invoking provider authorization parameters", () =>
  Effect.gen(function*() {
    const state = Redacted.make("original-state")
    const nonce = Redacted.make("original-nonce")
    const client = yield* Provider.makeOidc({
      ...oidc,
      authorizationParameters: (input) =>
        Effect.sync(() => {
          Redacted.wipeUnsafe(state)
          Redacted.wipeUnsafe(nonce)
          assert.strictEqual(Redacted.value(input.state), "original-state")
          assert.strictEqual(Redacted.value(input.nonce), "original-nonce")
          return { provider_hint: "hint" }
        })
    }).pipe(Effect.provideService(HttpClient.HttpClient, transport(() => Response.json({}))))
    const url = new URL(Redacted.value(yield* client.authorizationUrl({ state, nonce, codeChallenge: challenge })))
    assert.strictEqual(url.searchParams.get("state"), "original-state")
    assert.strictEqual(url.searchParams.get("nonce"), "original-nonce")
    assert.strictEqual(url.searchParams.get("provider_hint"), "hint")
  }))

it.effect("checks token receipts before profile loading and rejects only authenticated invalid profiles", () =>
  Effect.gen(function*() {
    let body: OAuth.JsonObject = tokenBody
    let status = 200
    let requests = 0
    let profileRequests = 0
    let profileValue: unknown = { id: "subject" }
    const client = yield* Provider.makeOAuth({ ...plain, pkce: false }).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        transport((request) => {
          requests++
          if (request.url === metadata.token_endpoint) {
            assert.strictEqual(form(request).get("code_verifier"), null)
            return Response.json(body, { status })
          }
          profileRequests++
          assert.strictEqual(request.headers.authorization, "Bearer private-access")
          return Response.json(profileValue)
        })
      )
    )
    const input = { code: Redacted.make("single-use-code"), pkceVerifier: codeInput.pkceVerifier }
    const url = new URL(Redacted.value(
      yield* client.authorizationUrl({
        state: Redacted.make("state"),
        codeChallenge: challenge
      })
    ))
    assert.strictEqual(url.searchParams.get("code_challenge"), null)
    const result = yield* client.exchangeCode(input)
    assert.strictEqual(result.identity.subject, "subject")
    assert.strictEqual(result.identity.issuer, metadata.issuer)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), { id: "subject" })
    assert.strictEqual(profileRequests, 1)

    const cases: ReadonlyArray<readonly [number, OAuth.JsonObject, string]> = [
      [200, { ...tokenBody, error: "invalid_grant" }, "OAuthUnavailable"],
      [400, { error: "unknown_error" }, "OAuthUnavailable"],
      [400, { error: "invalid_grant" }, "OAuthRejected"],
      [200, { access_token: "private-access" }, "OAuthUnavailable"]
    ]
    for (const [responseStatus, responseBody, expected] of cases) {
      body = responseBody
      status = responseStatus
      assert.strictEqual((yield* client.exchangeCode(input).pipe(Effect.flip))._tag, expected)
    }
    assert.strictEqual(profileRequests, 1)
    assert.strictEqual(requests, 6)

    body = tokenBody
    status = 200
    profileValue = { id: 42 }
    const rejected = yield* client.exchangeCode(input).pipe(Effect.flip)
    assert.strictEqual(rejected._tag, "OAuthRejected")
    if (rejected._tag === "OAuthRejected") assert.strictEqual(rejected.reason, "claims")
    assert.strictEqual(requests, 8)
  }))

it.effect("binds UserInfo to the verified subject and keeps signed claims authoritative", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const keys = yield* Effect.promise(() => jose.generateKeyPair("ES256", { extractable: true }))
    const jwk = yield* Effect.promise(() => jose.exportJWK(keys.publicKey))
    const token = yield* Effect.promise(() =>
      new jose.SignJWT(claims).setProtectedHeader({ alg: "ES256", kid: "key" }).sign(keys.privateKey)
    )
    let userinfoSubject = claims.sub
    let profileRequests = 0
    const http = transport((request) => {
      if (request.url === metadata.jwks_uri) return Response.json({ keys: [{ ...jwk, kid: "key" }] })
      if (request.url === metadata.token_endpoint) return Response.json({ ...tokenBody, id_token: token })
      profileRequests++
      return Response.json({ sub: userinfoSubject, name: "UserInfo Name", email: "userinfo@example.com" })
    })
    const clientOptions = {
      ...options,
      metadata: { ...metadata, id_token_signing_alg_values_supported: ["ES256"] }
    }
    const unsupported = yield* Provider.makeOidc({ ...oidc, client: clientOptions }).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.flip
    )
    assert.strictEqual(unsupported._tag, "OAuthConfigurationError")
    const client = yield* Provider.makeOidc({
      ...oidc,
      client: clientOptions,
      verifier: { algorithms: Oidc.defaultIdTokenAlgorithms },
      profile: Schema.Struct({ name: Schema.String, email: Schema.String }),
      subject: (_, verified) => Effect.succeed(verified.subject),
      loadProfile: (oauth, tokens) => oauth.fetchProfile(tokens.accessToken)
    }).pipe(Effect.provideService(HttpClient.HttpClient, http))
    const wrongNonce = yield* client.exchangeCode({ ...codeInput, nonce: Redacted.make("wrong-nonce") }).pipe(
      Effect.flip
    )
    assert.strictEqual(wrongNonce._tag, "OAuthRejected")
    assert.strictEqual(profileRequests, 0)
    const input = { ...codeInput, nonce: Redacted.make("nonce") }
    const result = yield* client.exchangeCode(input)
    assert.strictEqual(result.identity.subject, claims.sub)
    assert.deepStrictEqual(Redacted.value(result.identity.profile), {
      name: "UserInfo Name",
      email: "verified@example.com"
    })
    userinfoSubject = "different-subject"
    const rejected = yield* client.exchangeCode(input).pipe(Effect.flip)
    assert.strictEqual(rejected._tag, "OAuthRejected")
    if (rejected._tag === "OAuthRejected") assert.strictEqual(rejected.reason, "claims")
    assert.strictEqual(profileRequests, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("supports explicit no-PKCE form_post with HS256 and scoped per-exchange secrets", () =>
  Effect.gen(function*() {
    yield* TestClock.setTime(seconds * 1000)
    const verificationSecret = "verification-secret-at-least-thirty-two-bytes"
    const verifierHandle = Redacted.make(verificationSecret)
    const token = yield* Effect.promise(() =>
      new jose.SignJWT({ ...claims, id: "id" }).setProtectedHeader({ alg: "HS256" }).sign(
        new TextEncoder().encode(verificationSecret)
      )
    )
    const code = Redacted.make("single-use-code")
    const nonce = Redacted.make("nonce")
    const produced: Array<Redacted.Redacted<string>> = []
    const sent: Array<string | null> = []
    const client = yield* Provider.makeOidc({
      ...oidc,
      client: {
        ...options,
        authentication: { method: "client_secret_post" },
        metadata: {
          ...metadata,
          code_challenge_methods_supported: [],
          id_token_signing_alg_values_supported: ["HS256"]
        }
      },
      pkce: false,
      responseMode: "form_post",
      verifier: { algorithms: ["HS256"], clientSecret: verifierHandle },
      clientSecret: () =>
        Effect.sync(() => {
          Redacted.wipeUnsafe(code)
          Redacted.wipeUnsafe(nonce)
          const secret = Redacted.make(`request-secret-${produced.length}`)
          produced.push(secret)
          return secret
        })
    }).pipe(Effect.provideService(
      HttpClient.HttpClient,
      transport((request) => {
        const body = form(request)
        assert.strictEqual(body.get("code"), "single-use-code")
        assert.strictEqual(body.get("code_verifier"), null)
        sent.push(body.get("client_secret"))
        return Response.json({ ...tokenBody, id_token: token })
      })
    ))
    assert.strictEqual(Redacted.value(verifierHandle), verificationSecret)
    const url = new URL(Redacted.value(
      yield* client.authorizationUrl({
        state: Redacted.make("state"),
        nonce,
        codeChallenge: challenge
      })
    ))
    assert.strictEqual(url.searchParams.get("response_mode"), "form_post")
    assert.strictEqual(url.searchParams.get("nonce"), "nonce")
    assert.strictEqual(url.searchParams.get("code_challenge"), null)
    const result = yield* client.exchangeCode({ code, nonce, pkceVerifier: codeInput.pkceVerifier })
    assert.strictEqual(result.identity.subject, claims.sub)
    yield* client.exchangeCode({ code: Redacted.make("single-use-code"), nonce: Redacted.make("nonce") })
    assert.deepStrictEqual(sent, ["request-secret-0", "request-secret-1"])
    for (const secret of produced) assert.throws(() => Redacted.value(secret))
    const missingNonce = yield* client.exchangeCode({ code: Redacted.make("code") } as never).pipe(Effect.flip)
    assert.strictEqual(missingNonce._tag, "OAuthConfigurationError")
    assert.lengthOf(sent, 2)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("keeps composed profile-loader failures intact and cancels owned profile work", () =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const closed = yield* Deferred.make<void>()
    const owner = yield* Scope.make()
    const failure = Cause.combine(Cause.fail(OAuthError.Unavailable.make({})), Cause.die("profile cleanup"))
    const broken = yield* Provider.makeOAuth({
      ...plain,
      loadProfile: () => Effect.failCause(failure)
    }).pipe(Effect.provideService(HttpClient.HttpClient, transport(() => Response.json(tokenBody))))
    const result = yield* broken.exchangeCode(codeInput).pipe(Effect.exit)
    assert.isTrue(Exit.isFailure(result))
    if (Exit.isFailure(result)) assert.deepStrictEqual(result.cause.reasons, failure.reasons)

    const client = yield* Provider.makeOAuth({
      ...plain,
      loadProfile: () =>
        Deferred.succeed(entered, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(closed, undefined))
        )
    }).pipe(
      Scope.provide(owner),
      Effect.provideService(HttpClient.HttpClient, transport(() => Response.json(tokenBody)))
    )
    const fiber = yield* Effect.forkChild(client.exchangeCode(codeInput))
    yield* Deferred.await(entered)
    yield* Scope.close(owner, Exit.void)
    yield* Deferred.await(closed)
    const exit = yield* Fiber.await(fiber)
    assert.isTrue(Exit.isFailure(exit))
    if (Exit.isFailure(exit)) {
      assert.isTrue(
        exit.cause.reasons.some((reason) => Cause.isFailReason(reason) && reason.error._tag === "OAuthUnavailable")
      )
    }
    assert.strictEqual((yield* client.exchangeCode(codeInput).pipe(Effect.flip))._tag, "OAuthUnavailable")
  }))

it.effect("cancels and joins a request-secret factory when its provider owner closes", () =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    const owner = yield* Scope.make()
    let requests = 0
    const client = yield* Provider.makeOidc({
      ...oidc,
      client: { ...options, authentication: { method: "client_secret_post" } },
      clientSecret: () =>
        Deferred.succeed(entered, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(stopped, undefined))
        )
    }).pipe(
      Scope.provide(owner),
      Effect.provideService(
        HttpClient.HttpClient,
        transport(() => {
          requests++
          return Response.json(tokenBody)
        })
      )
    )
    const fiber = yield* Effect.forkChild(client.exchangeCode({ ...codeInput, nonce: Redacted.make("nonce") }))
    yield* Deferred.await(entered)
    yield* Scope.close(owner, Exit.void)
    yield* Deferred.await(stopped)
    const result = yield* Fiber.await(fiber)
    assert.isTrue(Exit.isFailure(result))
    assert.strictEqual(requests, 0)
  }).pipe(Effect.provide(cryptoLayer)))
