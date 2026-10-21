import { sql as storageSql } from "@effect/auth-persistence/OAuthPersistence"
import * as Auth from "@effect/auth/Auth"
import { AuthRequest } from "@effect/auth/Auth"
import { AuthContract } from "@effect/auth/Contracts"
import { LifecycleHooks } from "@effect/auth/Hooks"
import {
  OAuthCallbackId,
  OAuthConnectedActionEvidence,
  OAuthConnectedActionRequired,
  OAuthConnectedPersistence,
  OAuthConnectedProtocol,
  OAuthModuleId,
  OAuthProtocol,
  OAuthRedirectUri,
  OAuthReturnTargets,
  OAuthUnavailable
} from "@effect/auth/OAuth"
import { type AuthCredentialCommand, guest, RequestBindingFlowId } from "@effect/auth/Operations"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import { AuthenticationFlowId, AuthenticationRequirement } from "@effect/auth/Sessions"
import { OAuth } from "@effect/auth/Strategies"
import * as Strava from "@effect/auth/Strava"
import * as NodeCrypto from "@effect/platform-node/NodeCrypto"
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient"
import { assert, it } from "@effect/vitest"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import * as TestClock from "effect/testing/TestClock"

import { makeStorage } from "./fixtures/OAuthStorage.ts"

const keys = (byte: number) => ({
  activeKeyId: "key",
  keys: [{ id: "key", material: Redacted.make(Base64Url.encode(new Uint8Array(32).fill(byte))) }]
})

const contract = AuthContract.make("strava-test", {
  claims: Schema.Struct({ role: Schema.Literal("member"), athleteId: Schema.Int }),
  actions: (sessions) => ({
    signIn: AuthContract.oauthSignIn(),
    completeSignIn: AuthContract.oauthCompleteSignIn(sessions)
  })
})

const profile = Strava.accessProfile({ clientId: "1234", scopes: ["activity:read_all"] })

const AppAuth = Auth.make(contract, {
  sessions: Sessions.stateless(),
  strategies: { oauth: OAuth.make({ access: profile }) },
  defaultStrategy: "oauth"
})

const oauth = AppAuth.strategies.oauth
const moduleId = OAuthModuleId.make("strava-test/oauth")
const subjectId = SubjectId.make("athlete-123")
const callbackId = OAuthCallbackId.make("strava")

// The real adapter reads engine time after locking. Advance that clock and the
// workflow's TestClock together so expiry and claim deadlines agree.
const durable = Layer.effectDiscard(
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    yield* sql`CREATE TABLE oauth_test_clock (millis INTEGER NOT NULL)`
    yield* sql`INSERT INTO oauth_test_clock VALUES (${DateTime.toEpochMillis(yield* DateTime.now)})`
  })
).pipe(
  Layer.provideMerge(
    makeStorage({
      moduleId,
      provider: profile.provider,
      issuer: "https://www.strava.com",
      externalSubject: "123",
      subjectId,
      clock: {
        engineNowMillis: storageSql`(SELECT millis FROM oauth_test_clock)`,
        encodeInstant: (millis) => millis,
        toMillis: (expression) => expression,
        fromMillis: (expression) => expression,
        decodeInstant: Schema.decodeUnknownSync(Schema.Int)
      }
    }).pipe(Layer.provideMerge(LibsqlClient.layer({ url: "file::memory:", intMode: "number" })))
  ),
  Layer.provide(LifecycleHooks.empty)
)

const actionEvidence = Layer.succeed(OAuthConnectedActionEvidence, {
  verify: Effect.fnUntraced(function*({
    invocation,
    challenge,
    proof
  }: Parameters<OAuthConnectedActionEvidence["Service"]["verify"]>[0]) {
    if (
      invocation._tag !== "Authenticated" ||
      invocation.subjectId !== subjectId ||
      challenge.action !== "connected-disconnect" ||
      proof === undefined ||
      Redacted.value(proof) !== "disconnect-proof"
    ) {
      return yield* OAuthConnectedActionRequired.make({})
    }
    const credential = challenge.revision.credentials[0]

    if (credential === undefined) return yield* OAuthConnectedActionRequired.make({})

    return {
      source: { _tag: "Proof" as const },
      requirement: AuthenticationRequirement.make({
        maximumAgeMillis: 300_000,
        alternatives: [
          {
            factors: ["possession"],
            minimumCredentials: 1,
            userVerified: false,
            phishingResistant: false
          }
        ]
      }),
      evidence: Sessions.AuthenticationEvidence.make({
        revision: challenge.revision,
        flowId: AuthenticationFlowId.make(challenge.flowId),
        bindingDigest: challenge.bindingDigest,
        proofs: [
          {
            method: "oauth",
            credentialId: credential.credentialId,
            factors: ["possession" as const],
            userVerified: false,
            phishingResistant: false,
            verifiedAt: yield* DateTime.now
          }
        ]
      })
    }
  })
})

const advance = Effect.fnUntraced(function*(duration: Duration.Input) {
  const sql = yield* SqlClient.SqlClient
  const now = DateTime.toEpochMillis(yield* DateTime.now) + Duration.toMillis(duration)

  yield* sql`UPDATE oauth_test_clock SET millis = ${now}`
  yield* TestClock.adjust(duration)
})

const harness = (
  settings: {
    actionEvidence?: OAuthConnectedActionEvidence["Service"]
    authorizationUrl?: (value: Redacted.Redacted<string>) => Redacted.Redacted<string>
    failedRefresh?: boolean
    unknownGrantCommit?: boolean
    onRequest?: (operation: string) => Effect.Effect<void>
  } = {}
) => {
  const requests: Array<string> = []
  const signals: Array<AbortSignal> = []

  const client = HttpClient.make((request, url, signal) =>
    Effect.gen(function*() {
      const body = request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : ""

      const form = new URLSearchParams(body)
      const operation = form.get("grant_type") ?? url.pathname

      requests.push(operation)
      signals.push(signal)
      if (settings.onRequest) yield* settings.onRequest(operation)
      if (settings.failedRefresh && operation === "refresh_token") {
        return yield* Effect.die("provider disconnected after consuming refresh token")
      }

      const payload = url.pathname.endsWith("athlete")
        ? { id: 123 }
        : {
          token_type: "Bearer",
          access_token: operation === "refresh_token" ? "second-access" : "first-access",
          refresh_token: operation === "refresh_token" ? "second-refresh" : "first-refresh",
          expires_at: operation === "refresh_token" ? 43200 : 21600,
          athlete: { id: 123, firstname: "Pat" },
          scope: "activity:read_all"
        }

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } })
      )
    })
  )

  const storage = settings.unknownGrantCommit
    ? Layer.effect(
      OAuthConnectedPersistence,
      Effect.gen(function*() {
        const persistence = yield* OAuthConnectedPersistence

        return OAuthConnectedPersistence.of({
          ...persistence,
          settle: (input, prepare) =>
            persistence
              .settle(input, prepare)
              .pipe(
                Effect.flatMap((receipt) =>
                  input._tag === "SignIn"
                    ? Effect.fail(OAuthUnavailable.make({}))
                    : Effect.succeed(receipt)
                )
              )
        })
      })
    ).pipe(Layer.provideMerge(durable))
    : durable

  const protocols = Layer.effectContext(
    Effect.gen(function*() {
      const configured = yield* Strava.provider({
        clientId: "1234",
        clientSecret: Redacted.make("client-secret"),
        access: profile
      }).configure({
        provider: profile.provider,
        callbacks: [
          {
            callbackId,
            redirectUri: OAuthRedirectUri.make("https://app.example.com/auth/strava/callback")
          }
        ]
      })

      if (configured.connected === undefined) return yield* OAuthUnavailable.make({})
      const connected = configured.connected

      return Context.make(OAuthProtocol, configured).pipe(
        Context.add(OAuthConnectedProtocol, {
          ...connected,
          prepareAuthorization: (input) =>
            connected.prepareAuthorization(input).pipe(
              Effect.map((prepared) => ({
                ...prepared,
                authorizationUrl: settings.authorizationUrl?.(prepared.authorizationUrl) ??
                  prepared.authorizationUrl
              }))
            )
        })
      )
    })
  )

  const live = Layer.mergeAll(AppAuth.layer, oauth.access.accessLayer, oauth.access.layer).pipe(
    Layer.provide(Layer.succeed(Sessions.SessionSigningKeys, keys(1))),
    Layer.provide(LifecycleHooks.empty),
    Layer.provide(oauth.access.binding.layer),
    Layer.provide(
      settings.actionEvidence === undefined
        ? actionEvidence
        : Layer.succeed(OAuthConnectedActionEvidence, settings.actionEvidence)
    ),
    Layer.provide(protocols),
    Layer.provide(OAuth.OAuthTransactionProtector.layer(keys(2))),
    Layer.provide(OAuth.OAuthConnectedTransactionProtector.layer(keys(2))),
    Layer.provide(OAuth.OAuthConnectedTokenProtector.layer(keys(3))),
    Layer.provide(
      Auth.RequestBindingConfig.layer({ generation: 1, lifetimeMillis: 600_000, keyring: keys(4) })
    ),
    Layer.provide(OAuthReturnTargets.exactRoutes(["/sync"])),
    Layer.provide(Layer.succeed(HttpClient.HttpClient, client)),
    Layer.provide(
      Layer.succeed(oauth.SessionClaims, {
        resolve: () => Effect.succeed({ role: "member" as const, athleteId: 123 })
      })
    ),
    Layer.provideMerge(storage),
    Layer.provide(NodeCrypto.layer)
  )

  return { live, requests, signals }
}

const start = Effect.gen(function*() {
  const auth = yield* AppAuth
  const commands: Array<AuthCredentialCommand> = []

  const call = {
    invocation: guest,
    credentials: {},
    credentialCommandSink: (issued: ReadonlyArray<AuthCredentialCommand>) =>
      Effect.sync(() => {
        commands.push(...issued)
      })
  }

  const begin = yield* auth
    .signIn({ provider: profile.provider, returnTarget: "/sync" })
    .pipe(Effect.provideService(AuthRequest, call))

  const location = new URL(Redacted.value(begin.authorizationUrl))

  const binding = commands.find(
    (command) => command._tag === "Issue" && command.slot === "request-binding"
  )

  if (binding?._tag !== "Issue") return yield* Effect.die("Missing request binding")
  commands.length = 0

  const complete = auth
    .completeSignIn({
      flowId: begin.flowId,
      provider: profile.provider,
      callbackId,
      response: {
        _tag: "Code",
        code: "authorization-code",
        state: location.searchParams.get("state")!,
        scope: "activity:read_all"
      }
    })
    .pipe(
      Effect.provideService(AuthRequest, {
        ...call,
        credentials: { "request-binding": binding.credential }
      })
    )

  return { auth, commands, complete, call }
})

const signIn = Effect.gen(function*() {
  const started = yield* start
  const result = yield* started.complete

  if (
    !("completion" in result) ||
    result.completion._tag !== "Authenticated" ||
    result.connection === undefined
  ) {
    return yield* Effect.die("Sign-in did not authenticate and connect")
  }

  const issued = started.commands.find(
    (command) => command._tag === "Issue" && command.slot === "session"
  )

  if (issued?._tag !== "Issue") return yield* Effect.die("Missing session credential")

  const session = yield* started.auth.requireSession().pipe(
    Effect.provideService(AuthRequest, {
      ...started.call,
      credentials: { session: issued.credential }
    })
  )

  const access = yield* oauth.access.ConnectedAccess

  const caller = {
    _tag: "Authenticated" as const,
    subjectId: session.subjectId,
    sessionId: session.sessionId,
    assurance: session.assurance
  }

  return { ...started, session, caller, connection: result.connection, access }
})

it.effect("an uncertain refresh is never repeated, including after the attempt deadline", () => {
  const h = harness({ failedRefresh: true })
  const logs: Array<string> = []

  const logger = Logger.make((entry) => logs.push(JSON.stringify(Logger.formatStructured.log(entry))))

  return Effect.gen(function*() {
    const signedIn = yield* signIn

    yield* advance("6 hours")

    const use = signedIn.access.withAccessToken(
      signedIn.caller,
      signedIn.connection,
      () => Effect.void
    )

    assert.strictEqual(Exit.isFailure(yield* Effect.exit(use)), true)
    yield* advance("1 hour")
    assert.strictEqual(Exit.isFailure(yield* Effect.exit(use)), true)
    assert.lengthOf(h.requests.filter((value) => value === "refresh_token"), 1)
    assert.lengthOf(logs, 1)
    assert.include(logs[0], "Auth oauth-connected failed")
    assert.notInclude(logs[0], "provider disconnected after consuming refresh token")
  }).pipe(Effect.provide([h.live, Logger.layer([logger])]))
})

it.effect("libSQL persistence rejects ambient transactions", () =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    const persistence = yield* OAuthConnectedPersistence

    // Never expose a successful storage result before an outer owner's commit.
    const error = yield* sql
      .withTransaction(persistence.read({ moduleId, subjectId }))
      .pipe(Effect.flip)

    assert.strictEqual(error._tag, "OAuthUnavailable")
  }).pipe(Effect.provide(durable.pipe(Layer.provide(NodeCrypto.layer)))))

// The application verifier receives the generated target inside each operation.
it.effect("normal reconnect binds action evidence and replaces the selected grant", () => {
  const challenges: Array<
    Parameters<OAuthConnectedActionEvidence["Service"]["verify"]>[0]["challenge"]
  > = []

  let authorizationUrl = Redacted.make("")

  const h = harness({
    authorizationUrl: (value) => {
      authorizationUrl = Redacted.make(`${Redacted.value(value)}&padding=`.padEnd(16_384, "x"))

      return authorizationUrl
    },
    actionEvidence: {
      verify: Effect.fnUntraced(function*({ invocation, challenge, proof }) {
        if (
          invocation._tag !== "Authenticated" ||
          invocation.subjectId !== subjectId ||
          proof === undefined ||
          Redacted.value(proof) !== challenge.action
        ) {
          return yield* OAuthConnectedActionRequired.make({})
        }
        const credential = challenge.revision.credentials[0]

        if (credential === undefined) return yield* OAuthConnectedActionRequired.make({})
        challenges.push(challenge)

        return {
          source: { _tag: "Proof" as const },
          requirement: AuthenticationRequirement.make({
            maximumAgeMillis: 300_000,
            alternatives: [
              {
                factors: ["possession"],
                minimumCredentials: 1,
                userVerified: false,
                phishingResistant: false
              }
            ]
          }),
          evidence: Sessions.AuthenticationEvidence.make({
            revision: challenge.revision,
            flowId: AuthenticationFlowId.make(challenge.flowId),
            bindingDigest: challenge.bindingDigest,
            proofs: [
              {
                method: "independent-test-factor",
                credentialId: credential.credentialId,
                factors: ["possession"],
                userVerified: false,
                phishingResistant: false,
                verifiedAt: yield* DateTime.now
              }
            ]
          })
        }
      })
    }
  })

  return Effect.gen(function*() {
    const signedIn = yield* signIn
    const connected = yield* oauth.access.Connected
    const sql = yield* SqlClient.SqlClient

    const [before] =
      yield* sql`SELECT "grantVersion" FROM oauth_connected_grant WHERE "grantId" = ${signedIn.connection.grantId}`

    const result = yield* connected.begin(signedIn.caller, {
      flowId: RequestBindingFlowId.make("reconnect-flow"),
      callbackId,
      intent: { _tag: "Reconnect", grantId: signedIn.connection.grantId, profileKey: profile.key },
      returnTarget: "/sync",
      actionProof: Redacted.make("connected-begin")
    })

    assert.strictEqual(Redacted.value(result.value.authorizationUrl), Redacted.value(authorizationUrl))

    const binder = result.credentialCommands.find(
      (command) => command._tag === "Issue" && command.slot === "request-binding"
    )

    if (binder?._tag !== "Issue") return yield* Effect.die("Missing callback binder")

    const complete = connected.complete(signedIn.caller, {
      flowId: result.value.flowId,
      provider: profile.provider,
      callbackId,
      requestBinding: binder.credential,
      response: {
        _tag: "Code",
        code: Redacted.make("authorization-code"),
        state: Redacted.make(
          new URL(Redacted.value(result.value.authorizationUrl)).searchParams.get("state")!
        ),
        scope: "activity:read_all"
      },
      actionProof: Redacted.make("connected-complete")
    })

    const completed = yield* complete

    assert.containsSubset(completed.value, {
      _tag: "Connected",
      grantId: signedIn.connection.grantId
    })
    assert.deepStrictEqual(challenges.map((challenge) => challenge.action), [
      "connected-begin",
      "connected-complete"
    ])
    assert.strictEqual(challenges[0]?.flowId, result.value.flowId)
    assert.strictEqual(challenges[1]?.flowId, result.value.flowId)

    const [after] =
      yield* sql`SELECT "grantVersion" FROM oauth_connected_grant WHERE "grantId" = ${signedIn.connection.grantId}`

    assert.notStrictEqual(after?.grantVersion, before?.grantVersion)
    assert.strictEqual((yield* complete.pipe(Effect.flip))._tag, "OAuthRejected")
    assert.lengthOf(challenges, 2)

    const rows = yield* sql`SELECT snapshot FROM oauth_connected_flow WHERE "flowId" = ${result.value.flowId}`

    assert.lengthOf(rows, 0)
  }).pipe(Effect.provide(h.live))
})

it.effect(
  "a lost grant-commit response issues no session and cannot repeat the authorization code",
  () => {
    const h = harness({ unknownGrantCommit: true })

    return Effect.gen(function*() {
      const started = yield* start

      assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "OAuthUnavailable")
      assert.lengthOf(started.commands, 0)
      const sql = yield* SqlClient.SqlClient
      const grants = yield* sql`SELECT grantId FROM oauth_connected_grant`

      assert.lengthOf(grants, 1)
      assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "OAuthRejected")
      assert.lengthOf(h.requests.filter((value) => value === "authorization_code"), 1)
    }).pipe(Effect.provide(h.live))
  }
)

it.effect(
  "a stalled callback times out, closes its provider work, and cannot be exchanged again",
  () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const finalized = yield* Deferred.make<void>()

      const h = harness({
        onRequest: () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.ensuring(Deferred.succeed(finalized, undefined))
          )
      })

      yield* Effect.gen(function*() {
        const started = yield* start
        const fiber = yield* started.complete.pipe(Effect.flip, Effect.forkChild)

        yield* Deferred.await(entered)
        yield* advance("31 seconds")
        assert.strictEqual((yield* Fiber.join(fiber))._tag, "OAuthUnavailable")
        assert.strictEqual(yield* Deferred.isDone(finalized), true)
        assert.strictEqual(h.signals.every((signal) => signal.aborted), true)
        assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "OAuthRejected")
        assert.deepStrictEqual(h.requests, ["authorization_code"])
      }).pipe(Effect.provide(h.live))
    })
)

it.effect(
  "concurrent refresh callers exchange once, and disconnect prevents a late refresh from restoring access",
  () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const proceed = yield* Deferred.make<void>()

      const h = harness({
        onRequest: (operation) =>
          operation === "refresh_token"
            ? Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(proceed)))
            : Effect.void
      })

      yield* Effect.gen(function*() {
        const signedIn = yield* signIn

        yield* advance("6 hours")
        let uses = 0

        const access = signedIn.access.withAccessToken(signedIn.caller, signedIn.connection, () =>
          Effect.sync(() => {
            uses++
          }))

        const first = yield* access.pipe(Effect.forkChild)

        yield* Deferred.await(entered)
        assert.strictEqual(Exit.isFailure(yield* Effect.exit(access)), true)
        yield* signedIn.auth
          .disconnectAccount({
            commandId: "disconnect",
            grantId: signedIn.connection.grantId,
            actionProof: "disconnect-proof"
          })
          .pipe(
            Effect.provideService(AuthRequest, { ...signedIn.call, invocation: signedIn.caller })
          )
        yield* Deferred.succeed(proceed, undefined)
        assert.strictEqual(Exit.isFailure(yield* Effect.exit(Fiber.join(first))), true)
        assert.strictEqual(Exit.isFailure(yield* Effect.exit(access)), true)
        assert.strictEqual(uses, 0)
        assert.lengthOf(h.requests.filter((value) => value === "refresh_token"), 1)
      }).pipe(Effect.provide(h.live))
    })
)
