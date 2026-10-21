import * as GitHub from "@effect/auth/GitHub"
import {
  OAuthCallbackId,
  OAuthConnectedProtocol,
  OAuthConnectedTokenContext,
  OAuthIssuer,
  OAuthProtocol,
  type OAuthProtocolPreparation,
  OAuthProviderKey,
  OAuthRedirectUri
} from "@effect/auth/OAuth"
import * as OpenIdConnect from "@effect/auth/OpenIdConnect"
import { RequestBindingFlowId } from "@effect/auth/Operations"
import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Deferred, Effect, Exit, Fiber, Layer, Redacted, Schema, Scope } from "effect"
import { FetchHttpClient } from "effect/http"
import { TestClock } from "effect/testing"
import { webCryptoLayer as layerWebCrypto } from "../../utils/crypto.ts"
import { mockFetch } from "../../utils/fetch.ts"

import { expectTag } from "./helpers/oauth.ts"

const json = (body: unknown, status = 200) => Response.json(body, { status })

const platform = Layer.mergeAll(
  FetchHttpClient.layer,
  layerWebCrypto
)

const loadProtocol = (options: OpenIdConnect.Options) =>
  Layer.build(OpenIdConnect.layer(options)).pipe(
    Effect.map(Context.get(OAuthProtocol)),
    Effect.provide(platform)
  )

const github = (
  configurationGeneration?: number,
  issuance?: "active" | "retired",
  verifiedPrimaryEmail = false
) =>
  GitHub.gitHubOAuthAppProvider({
    configurationGeneration: configurationGeneration ?? 1,
    issuance: issuance ?? "active",
    verifiedPrimaryEmail,
    clientId: `github-${configurationGeneration ?? 1}`,
    clientSecret: Redacted.make(`github-secret-${configurationGeneration ?? 1}`),
    callbacks: [
      {
        callbackId: OAuthCallbackId.make("github"),
        redirectUri: OAuthRedirectUri.make("https://app.test/auth/github/callback")
      }
    ]
  })

const primaryEmail = { email: "private-primary@example.test", primary: true, verified: true }

const secondaryEmails = Array.from({ length: 100 }, (_, index) => ({
  email: `secondary-${index}@example.test`,
  primary: false,
  verified: true
}))

const makeTransport = (
  input: {
    readonly userResponse?: () => Response
    readonly emailResponse?: (url: URL) => Response
  } = {}
) => {
  let scope = "read:user"
  const requests: Array<{ url: string; clientId: string | null; method: string | undefined }> = []

  const fetch: typeof globalThis.fetch = mockFetch(async (request, init) => {
    const url = request instanceof Request ? request.url : String(request)

    const form = init?.body instanceof URLSearchParams
      ? init.body
      : new URLSearchParams(
        typeof init?.body === "string"
          ? init.body
          : init?.body instanceof Uint8Array
          ? new TextDecoder().decode(init.body)
          : ""
      )

    requests.push({ url, clientId: form.get("client_id"), method: init?.method })
    if (url === "https://github.com/login/oauth/access_token") {
      return json({
        access_token: "github-token-never-returned",
        token_type: "bearer",
        scope
      })
    }
    if (url.startsWith("https://api.github.com/user/emails?")) {
      assert.match(url, /^https:\/\/api\.github\.com\/user\/emails\?per_page=100&page=\d+$/u)
      assert.strictEqual(init?.method, "GET")
      assert.match(init?.redirect ?? "", /^(?:error|manual)$/u)
      assert.strictEqual(init?.credentials, "omit")
      const headers = new Headers(init?.headers)

      assert.match(headers.get("authorization") ?? "", /^Bearer (?:github-token-never-returned|access)$/u)
      assert.strictEqual(headers.has("cookie"), false)
      assert.strictEqual(headers.has("traceparent"), false)

      return input.emailResponse?.(new URL(url)) ?? json([primaryEmail])
    }
    if (url === "https://api.github.com/user") {
      return (
        input.userResponse?.() ??
          json({ id: 42, login: "octocat", email: "untrusted-profile@example.test" })
      )
    }
    throw new Error("Unexpected endpoint")
  })

  return {
    fetch,
    requests,
    consent: (started: OAuthProtocolPreparation) => {
      const value = new URL(Redacted.value(started.authorizationUrl)).searchParams.get("scope")

      scope = (value ?? "").replaceAll(" ", ",")

      return value
    }
  }
}

const begin = (protocol: OAuthProtocol["Service"], provider: "github") =>
  protocol.prepareAuthorization({
    provider: OAuthProviderKey.make(provider),
    flowId: RequestBindingFlowId.make(`flow-${provider}`)
  })

const exchange = Effect.fn("test.exchange")(function*(
  protocol: OAuthProtocol["Service"],
  started: OAuthProtocolPreparation
) {
  return yield* protocol.exchangeVerifiedIdentity({
    configuration: started.configuration,
    secrets: started.secrets,
    verificationStartedAt: yield* DateTime.now,
    response: {
      _tag: "Code",
      state: started.secrets.state,
      code: Redacted.make("single-use-code"),
      ...(started.configuration.responseIssuerMode === "required"
        ? { issuer: started.configuration.issuer }
        : {})
    }
  })
})

// At baseline 5199d99, invalid provider.configure input dies instead of failing in typed E.
it.effect("fails invalid GitHub provider configuration through the typed error channel", () =>
  expectTag(
    GitHub.provider({
      clientId: "invalid client id",
      clientSecret: Redacted.make("fixture-secret")
    })
      .configure({
        provider: OAuthProviderKey.make("github"),
        callbacks: [
          {
            callbackId: OAuthCallbackId.make("github"),
            redirectUri: OAuthRedirectUri.make("https://app.test/callback")
          }
        ]
      })
      .pipe(Effect.provide(platform)),
    "OpenIdConnectConfigurationError"
  ))

// https://github.com/yielded-dev/auth/issues/183: /user alone omits private email.
// Native HTTP fixtures can force pagination and unsafe responses without live account access.
describe("GitHub verified primary email", () => {
  it.effect(
    "captures opt-in consent and selects the private primary across pages without changing /user",
    () =>
      Effect.gen(function*() {
        const transport = makeTransport({
          userResponse: () => json({ id: 42, login: "octocat", email: null }),
          emailResponse: (url) =>
            url.searchParams.get("page") === "1"
              ? Response.json(secondaryEmails, {
                headers: { link: "<https://untrusted.example/emails>; rel=\"next\"" }
              })
              : json([primaryEmail])
        })

        const input = {
          clientId: "client",
          clientSecret: Redacted.make("fixture-secret"),
          verifiedPrimaryEmail: true
        }

        const protocol = yield* GitHub.provider(input)
          .configure({
            provider: OAuthProviderKey.make("github"),
            callbacks: [
              {
                callbackId: OAuthCallbackId.make("github"),
                redirectUri: OAuthRedirectUri.make("https://app.test/callback")
              }
            ]
          })
          .pipe(
            Effect.provide(platform),
            Effect.provideService(FetchHttpClient.Fetch, transport.fetch)
          )

        input.verifiedPrimaryEmail = false
        const started = yield* begin(protocol, "github")
        const consent = transport.consent(started)
        const identity = yield* exchange(protocol, started)

        assert.strictEqual(identity.profile?.email, primaryEmail.email)
        assert.strictEqual(identity.profile?.emailVerified, true)
        assert.strictEqual(identity.identity.subject, "42")
        assert.deepStrictEqual(identity.profile?.providerData, { id: 42, login: "octocat", email: null })
        assert.notInclude(JSON.stringify(identity), "github-token-never-returned")
        assert.strictEqual(consent, "read:user user:email")
        assert.deepStrictEqual(transport.requests.map(({ url }) => url), [
          "https://github.com/login/oauth/access_token",
          "https://api.github.com/user",
          "https://api.github.com/user/emails?per_page=100&page=1",
          "https://api.github.com/user/emails?per_page=100&page=2"
        ])

        const ordinaryTransport = makeTransport()

        const ordinary = yield* loadProtocol({ providers: [github()] }).pipe(
          Effect.provideService(FetchHttpClient.Fetch, ordinaryTransport.fetch)
        )

        const ordinaryStart = yield* begin(ordinary, "github")
        const ordinaryIdentity = yield* exchange(ordinary, ordinaryStart)

        assert.strictEqual(ordinaryTransport.consent(ordinaryStart), "read:user")
        assert.strictEqual(ordinaryIdentity.profile?.email, "untrusted-profile@example.test")
        assert.isUndefined(ordinaryIdentity.profile?.emailVerified)
        assert.lengthOf(ordinaryTransport.requests, 2)
      })
  )

  it.effect.each([
    {
      name: "unverified primary and verified secondary",
      emails: [secondaryEmails[0], { ...primaryEmail, verified: false }]
    },
    {
      name: "ambiguous primaries",
      emails: [primaryEmail, { ...primaryEmail, email: "other-primary@example.test" }]
    }
  ])("omits normalized email for $name instead of substituting /user email", ({ emails }) =>
    Effect.gen(function*() {
      const transport = makeTransport({ emailResponse: () => json(emails) })

      const services = yield* Layer.build(
        GitHub.layer({
          clientId: "client",
          clientSecret: Redacted.make("fixture-secret"),
          redirectUri: "https://app.test/callback",
          verifiedPrimaryEmail: true
        })
      ).pipe(
        Effect.provide(platform),
        Effect.provideService(FetchHttpClient.Fetch, transport.fetch)
      )

      const protocol = Context.get(services, OAuthProtocol)
      const started = yield* begin(protocol, "github")

      transport.consent(started)
      const identity = yield* exchange(protocol, started)

      assert.notProperty(identity.profile, "email")
      assert.notProperty(identity.profile, "emailVerified")
      assert.strictEqual(identity.profile?.providerData?.email, "untrusted-profile@example.test")
      assert.strictEqual(identity.identity.subject, "42")
      assert.lengthOf(transport.requests, 3)
    }))

  it.effect.each([
    {
      name: "unterminated pagination",
      response: () => json(secondaryEmails),
      requests: 12,
      tag: "OAuthUnavailable" as const
    },
    {
      name: "oversized body",
      response: () => new Response("x".repeat(65_537), { headers: { "content-type": "application/json" } }),
      requests: 3,
      tag: "OAuthUnavailable" as const
    },
    {
      name: "redirect",
      response: () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://untrusted.example/emails" }
        }),
      requests: 3,
      tag: "OAuthUnavailable" as const
    },
    {
      name: "malformed verification flag",
      response: () => json([{ ...primaryEmail, verified: "true" }]),
      requests: 3,
      tag: "OAuthProtocolRejected" as const
    }
  ])("rejects $name without repeating the exchange", (failure) =>
    Effect.gen(function*() {
      const transport = makeTransport({ emailResponse: failure.response })

      const protocol = yield* loadProtocol({ providers: [github(1, "active", true)] }).pipe(
        Effect.provideService(FetchHttpClient.Fetch, transport.fetch)
      )

      const started = yield* begin(protocol, "github")

      transport.consent(started)
      yield* expectTag(exchange(protocol, started), failure.tag)
      assert.lengthOf(transport.requests, failure.requests)
      assert.lengthOf(transport.requests.filter(({ method }) => method === "POST"), 1)
    }))

  it.effect("requires explicit email permission in retained access profiles", () =>
    expectTag(
      Layer.build(
        GitHub.layerConnected({
          clientId: "client",
          clientSecret: Redacted.make("fixture-secret"),
          redirectUri: "https://app.test/callback",
          verifiedPrimaryEmail: true,
          profiles: [GitHub.accessProfile({ clientId: "client" })]
        })
      ).pipe(Effect.provide(platform)),
      "OpenIdConnectConfigurationError"
    ))
})

describe("OAuth protocol credential and resource lifetimes", () => {
  // At 28374b35, owner closure left application identity decoding running after HTTP completed.
  it.effect("joins identity decoder cleanup when its provider scope closes", () =>
    Effect.gen(function*() {
      const owner = yield* Scope.fork(yield* Effect.scope)
      const entered = yield* Deferred.make<void>()
      const resume = yield* Deferred.make<void>()
      const cleanup = yield* Deferred.make<void>()
      let interrupted = false
      const provider = github()
      const transport = makeTransport()

      const services = yield* Layer.buildWithScope(
        OpenIdConnect.layer({
          providers: [
            {
              ...provider,
              identitySource: {
                ...provider.identitySource,
                decodeIdentity: () =>
                  Deferred.succeed(entered, undefined).pipe(
                    Effect.andThen(Deferred.await(resume)),
                    Effect.as({ subject: "42" }),
                    Effect.onInterrupt(() =>
                      Effect.sync(() => {
                        interrupted = true
                      })
                    ),
                    Effect.ensuring(Deferred.await(cleanup))
                  )
              }
            }
          ]
        }).pipe(Layer.provide(platform)),
        owner
      ).pipe(Effect.provideService(FetchHttpClient.Fetch, transport.fetch))

      const protocol = Context.get(services, OAuthProtocol)
      const started = yield* begin(protocol, "github")
      const active = yield* exchange(protocol, started).pipe(Effect.result, Effect.forkChild)

      yield* Deferred.await(entered)
      const closing = yield* Scope.close(owner, Exit.void).pipe(Effect.forkChild)

      yield* TestClock.adjust(1)
      const closeBeforeCleanup = closing.pollUnsafe()
      const interruptedBeforeCleanup = interrupted

      yield* Deferred.succeed(resume, undefined)
      yield* Deferred.succeed(cleanup, undefined)
      yield* Fiber.join(closing)
      const result = yield* Fiber.join(active)

      assert.deepNestedInclude(result, { "_tag": "Failure", "failure._tag": "OAuthUnavailable" })
      assert.strictEqual(interruptedBeforeCleanup, true)
      assert.isUndefined(closeBeforeCleanup)
      yield* expectTag(exchange(protocol, started), "OAuthUnavailable")
    }))

  it.effect(
    "finishes captured retired generations and never substitutes the active credentials",
    () =>
      Effect.gen(function*() {
        const transport = makeTransport()

        const old = yield* loadProtocol({
          providers: [github(1, "active", true)],
          timeoutSeconds: 1
        }).pipe(Effect.provideService(FetchHttpClient.Fetch, transport.fetch))

        const started = yield* begin(old, "github")

        transport.consent(started)

        const current = yield* loadProtocol({
          providers: [github(1, "retired", true), github(2)],
          timeoutSeconds: 1
        }).pipe(Effect.provideService(FetchHttpClient.Fetch, transport.fetch))

        const identity = yield* exchange(current, started)

        assert.strictEqual(identity.profile?.email, primaryEmail.email)
        assert.strictEqual(identity.profile?.emailVerified, true)
        assert.strictEqual(
          new URL(
            Redacted.value((yield* begin(current, "github")).authorizationUrl)
          ).searchParams.get("scope"),
          "read:user"
        )
        assert.deepStrictEqual(
          transport.requests
            .filter((request) => request.method === "POST")
            .map((request) => request.clientId),
          ["github-1"]
        )
        const count = transport.requests.length

        yield* expectTag(
          exchange(current, {
            ...started,
            configuration: {
              ...started.configuration,
              issuer: OAuthIssuer.make("https://accounts.google.com")
            }
          }),
          "OAuthUnavailable"
        )
        yield* expectTag(
          exchange(current, {
            ...started,
            configuration: { ...started.configuration, configurationGeneration: 99 }
          }),
          "OAuthUnavailable"
        )
        assert.lengthOf(transport.requests, count)
      })
  )

  for (const termination of ["interruption", "timeout"]) {
    it.effect(`${termination} cancels the private email body without repeating the exchange`, () =>
      Effect.gen(function*() {
        const reading = yield* Deferred.make<void>()
        let cancelled = false

        const transport = makeTransport({
          emailResponse: () =>
            new Response(
              new ReadableStream(
                {
                  pull() {
                    Deferred.doneUnsafe(reading, Effect.void)
                  },
                  cancel() {
                    cancelled = true
                  }
                },
                { highWaterMark: 0 }
              ),
              { headers: { "content-type": "application/json" } }
            )
        })

        const protocol = yield* loadProtocol({
          providers: [github(1, "active", true)],
          timeoutSeconds: 1
        }).pipe(Effect.provideService(FetchHttpClient.Fetch, transport.fetch))

        const started = yield* begin(protocol, "github")

        transport.consent(started)
        const fiber = yield* exchange(protocol, started).pipe(Effect.forkChild)

        const reached = yield* Effect.raceFirst(
          Deferred.await(reading).pipe(Effect.as("reading")),
          Fiber.await(fiber).pipe(Effect.as("completed"))
        )

        assert.strictEqual(reached, "reading")
        if (termination === "interruption") yield* Fiber.interrupt(fiber)
        else {
          yield* TestClock.adjust("1 second")
          yield* expectTag(Fiber.join(fiber), "OAuthUnavailable")
        }
        assert.strictEqual(cancelled, true)
        assert.lengthOf(transport.requests.filter((request) => request.method === "POST"), 1)
      }))
  }
})

it.effect("inspects GitHub's raw expiry and terminal receipt before token normalization", () =>
  Effect.gen(function*() {
    let receipt: unknown = { error: "bad_verification_code" }
    let calls = 0
    const transport = makeTransport()

    const fetch: typeof globalThis.fetch = mockFetch(async (request, init) => {
      const url = request instanceof Request ? request.url : String(request)

      if (url === "https://github.com/login/oauth/access_token") {
        calls++

        return json(receipt)
      }

      return transport.fetch(request, init)
    })

    const protocol = yield* loadProtocol({ providers: [github()], timeoutSeconds: 1 }).pipe(
      Effect.provideService(FetchHttpClient.Fetch, fetch)
    )

    const started = yield* begin(protocol, "github")

    yield* expectTag(exchange(protocol, started), "OAuthProtocolRejected")
    receipt = {
      access_token: "access",
      token_type: "bearer",
      scope: "read:user",
      expires_in: "3600"
    }
    yield* expectTag(exchange(protocol, started), "OAuthUnavailable")
    assert.strictEqual(calls, 2)
    assert.lengthOf(transport.requests, 0)
    yield* expectTag(
      protocol.exchangeVerifiedIdentity({
        configuration: started.configuration,
        secrets: started.secrets,
        verificationStartedAt: yield* DateTime.now,
        response: {
          _tag: "Code",
          state: Redacted.make("a".repeat(43)),
          code: Redacted.make("code"),
          issuer: started.configuration.issuer
        }
      }),
      "OAuthProtocolRejected"
    )
    assert.strictEqual(calls, 2)
  }))

it.effect("owns GitHub cohort revocation until its provider scope closes", () =>
  Effect.gen(function*() {
    const owner = yield* Scope.fork(yield* Effect.scope)

    const sent = yield* Deferred.make<void>()
    let deletes = 0
    let aborted = false
    let suspend = false

    const transport = makeTransport()

    const fetch: typeof globalThis.fetch = mockFetch(async (request, init) => {
      const url = request instanceof Request ? request.url : String(request)

      if (url === "https://github.com/login/oauth/access_token") {
        return json({
          access_token: "access",
          refresh_token: "refresh",
          token_type: "bearer",
          scope: "read:user,user:email",
          expires_in: 3600,
          refresh_token_expires_in: 7200
        })
      }
      if (url === "https://api.github.com/applications/client/grant") {
        deletes++
        assert.strictEqual(init?.method, "DELETE")
        if (!suspend) return new Response(null, { status: 204 })

        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              aborted = true
              reject(new DOMException("Closed provider", "AbortError"))
            },
            { once: true }
          )
          Deferred.doneUnsafe(sent, Effect.void)
        })
      }

      return transport.fetch(request, init)
    })

    const profile = GitHub.accessProfile({
      clientId: "client",
      scopes: ["read:user", "user:email"]
    })

    const services = yield* Layer.buildWithScope(
      GitHub.layerConnected({
        clientId: "client",
        clientSecret: Redacted.make("secret"),
        redirectUri: "https://app.test/callback",
        profiles: [profile],
        verifiedPrimaryEmail: true
      }).pipe(Layer.provide(platform)),
      owner
    ).pipe(Effect.provideService(FetchHttpClient.Fetch, fetch))

    const protocol = Context.get(services, OAuthConnectedProtocol)

    const began = yield* protocol.prepareAuthorization({
      profile,
      callbackId: OAuthCallbackId.make("github"),
      flowId: RequestBindingFlowId.make("flow")
    })

    const now = yield* DateTime.now

    const grant = yield* protocol.exchangeGrant({
      configuration: began.configuration,
      secrets: began.secrets,
      verificationStartedAt: now,
      response: {
        _tag: "Code",
        code: Redacted.make("code"),
        state: began.secrets.state,
        issuer: began.configuration.issuer
      }
    })

    assert.strictEqual(grant.identity.subject, "42")
    assert.strictEqual(grant.profile?.email, primaryEmail.email)
    assert.strictEqual(grant.profile?.emailVerified, true)
    assert.deepStrictEqual(grant.scopes, ["read:user", "user:email"])
    const start = DateTime.toEpochMillis(now)

    const context = yield* Schema.decodeUnknownEffect(Schema.toType(OAuthConnectedTokenContext))({
      namespace: "effect-auth/oauth-connected-token-context/v1",
      exchangeOrder: "1",
      moduleId: "oauth",
      subjectId: "subject",
      identity: grant.identity,
      configuration: began.configuration,
      grantId: "grant",
      grantVersion: "1",
      tokenVersion: "1",
      cohortGeneration: "1",
      metadata: {
        scopes: grant.scopes,
        resources: grant.resources,
        accessExpiresAtMillis: grant.accessExpiresAtMillis,
        useUntilMillis: start + 100000,
        refreshUseUntilMillis: start + 200000,
        obtainedAtMillis: start
      }
    })

    const revoke = protocol.revokeGrant({ context, material: grant.material })

    assert.strictEqual(yield* revoke, "Confirmed")
    suspend = true

    const active = yield* Effect.forkChild(revoke)

    yield* Deferred.await(sent)
    yield* Scope.close(owner, Exit.void)
    assert.strictEqual(aborted, true)
    yield* expectTag(Fiber.join(active), "OAuthUnavailable")
    yield* expectTag(revoke, "OAuthUnavailable")
    assert.strictEqual(deletes, 2)
  }))
