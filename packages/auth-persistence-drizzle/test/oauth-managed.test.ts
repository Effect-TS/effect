import * as OAuthPersistence from "@effect/auth-persistence/OAuthPersistence"
import * as Auth from "@effect/auth/Auth"
import type { CommitJournal, PreparedCommit } from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Operations from "@effect/auth/Operations"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import { assert, it } from "@effect/vitest"
import { getTableName } from "drizzle-orm"
import * as Context from "effect/Context"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import {
  configuration,
  Fitness,
  identity,
  profile,
  requiredService,
  requirement,
  RetainedFitness,
  setup,
  StatelessFitness
} from "./fixtures/oauth-managed.ts"

// Human-requested composed OAuth regression: managed schema and public driver exports,
// rather than explicit OAuth factories. D1 substitutes only the transport with real SQLite.
const backends = ["sqlite", "d1", "pglite"] as const
const moduleId = OAuth.OAuthModuleId.make("strava/oauth")

// Human-requested import atomicity: reject authority insertion on both commit owners.
it.live.each(["sqlite", "d1"] as const)(
  "%s OAuth imports roll back partial rows and reject unavailable subjects",
  (backend) =>
    Effect.gen(function*() {
      const fixture = yield* setup(backend, false, "stateful", false)
      const sql = Context.get(fixture.context, SqlClient.SqlClient)
      const importer = requiredService(fixture.context, OAuthPersistence.IdentityImports)

      const input = yield* Schema.decodeEffect(OAuthPersistence.IdentityImport)({
        moduleId,
        subjectId: "athlete",
        ...identity
      })

      const rejected = Effect.fnUntraced(function*(value: typeof input) {
        assert.containsSubset(yield* importer.importIdentity(value).pipe(Effect.result), {
          _tag: "Failure",
          failure: { _tag: "OAuthUnavailable" }
        })
      })

      yield* rejected({ ...input, subjectId: SubjectId.make("missing") })
      yield* rejected({ ...input, moduleId: OAuth.OAuthModuleId.make("disabled") })
      // Admission must use the same snapshot as the deferred import.
      const mutable = { ...input }
      const deferred = importer.importIdentity(mutable)

      mutable.moduleId = OAuth.OAuthModuleId.make("disabled")
      assert.containsSubset(yield* deferred.pipe(Effect.result), {
        _tag: "Failure",
        failure: { _tag: "OAuthUnavailable" }
      })
      yield* rejected({ ...input, subject: "\ud800" })
      yield* sql`update athletes set active = 0`
      yield* rejected(input)
      yield* sql`update athletes set active = 1`
      const authority = getTableName(fixture.table("credentials"))

      yield* sql.unsafe(
        `create trigger reject_import before insert on "${authority}" begin select raise(abort, 'import failure'); end`
      )
      yield* rejected(input)
      for (const role of ["oauthIdentities", "oauthCredentials", "credentials"]) {
        assert.deepStrictEqual(yield* sql`select count(*) as count from ${sql(getTableName(fixture.table(role)))}`, [{
          count: 0
        }])
      }
      yield* sql`drop trigger reject_import`
      const imported = yield* importer.importIdentity(input)

      assert.containsSubset(yield* fixture.signIn.resolve({ moduleId, identity }), {
        credentialId: imported.credentialId,
        revision: { subjectId: "athlete" }
      })
      // Migration retries must never repair split authority.
      yield* sql`delete from ${sql(authority)}`
      yield* rejected(input)
      assert.deepStrictEqual(yield* sql`select count(*) as count from ${sql(authority)}`, [{ count: 0 }])
      fixture.assertBatchExecution()
    })
)

function prepare<A>(value: A, journal: CommitJournal): PreparedCommit<A> {
  return journal.prepare(value)
}

it.live.each([
  ...backends.map((backend) => ({ backend, sessionMode: "stateful" as const })),
  { backend: "d1", sessionMode: "stateless" } as const
])(
  "$backend $sessionMode managed fitness OAuth signs in an existing athlete and verifies its session",
  ({ backend, sessionMode }) =>
    Effect.gen(function*() {
      const fixture = yield* setup(backend, false, sessionMode, false)
      const app = sessionMode === "stateless" ? StatelessFitness : Fitness
      const sql = Context.get(fixture.context, SqlClient.SqlClient)
      // Human-requested migration seam (#200): import, retry, then the real callback/session.
      const importer = requiredService(fixture.context, OAuthPersistence.IdentityImports)

      const input = yield* Schema.decodeEffect(OAuthPersistence.IdentityImport)({
        moduleId,
        subjectId: "athlete",
        ...identity
      })

      const imported = yield* importer.importIdentity(input)

      assert.deepStrictEqual(yield* importer.importIdentity(input), imported)
      yield* sql`insert into athletes (id, active, revision) values ('other', ${
        backend === "pglite" ? true : 1
      }, 'other-v1')`
      assert.containsSubset(
        yield* importer
          .importIdentity({ ...input, subjectId: SubjectId.make("other") })
          .pipe(Effect.result),
        { _tag: "Failure", failure: { _tag: "OAuthUnavailable" } }
      )
      for (const role of ["oauthIdentities", "oauthCredentials", "credentials"]) {
        assert.deepStrictEqual(yield* sql`select count(*) as count from ${sql(getTableName(fixture.table(role)))}`, [{
          count: 1
        }])
      }
      const flowTable = getTableName(fixture.table("oauthSignInFlows"))
      const delivered = new Map<Operations.CredentialSlot, Redacted.Redacted<string>>()
      let exchanges = 0

      const keyring = {
        activeKeyId: "test",
        keys: [{ id: "test", material: Redacted.make("A".repeat(43)) }]
      }

      const dependencies = Layer.mergeAll(
        Layer.succeed(app.strategies.strava.SessionClaims, {
          resolve: () => Effect.succeed({ displayName: "Ada Athlete" })
        }),
        Layer.succeed(OAuth.OAuthProtocol, {
          prepareAuthorization: () =>
            Effect.succeed({
              configuration,
              authorizationUrl: Redacted.make("https://www.strava.com/oauth/authorize"),
              secrets: {
                namespace: "effect-auth/oauth-transaction-secrets/v1",
                state: Redacted.make("A".repeat(43))
              }
            }),
          exchangeVerifiedIdentity: () =>
            Effect.sync(() => {
              exchanges++

              return { identity }
            })
        }),
        Layer.succeed(Sessions.SessionSigningKeys, keyring),
        OAuth.OAuthReturnTargets.exactRoutes(["/activities"]),
        OAuth.OAuthTransactionProtector.layer(keyring),
        Auth.RequestBindingConfig.layer({ generation: 1, lifetimeMillis: 300_000, keyring })
      ).pipe(
        Layer.provideMerge(
          Layer.merge(Kdf.layerPortable, KdfAdmission.layer())
        ),
        Layer.provideMerge(Layer.succeedContext(fixture.context))
      )

      const services = yield* Layer.build(dependencies)
      const auth = yield* app.make.pipe(Effect.provide(services))

      const request = {
        credentials: {},
        credentialCommandSink: (commands: ReadonlyArray<Operations.AuthCredentialCommand>) =>
          Effect.sync(() => {
            for (const command of commands) {
              if (command._tag === "Issue") delivered.set(command.slot, command.credential)
            }
          })
      }

      const begun = yield* auth
        .signIn({ provider: "strava", returnTarget: "/activities" })
        .pipe(Effect.provideService(Auth.AuthRequest, request))

      const binding = delivered.get("request-binding")

      if (sessionMode === "stateless") {
        assert.deepStrictEqual(yield* sql`select count(*) as count from ${sql(flowTable)}`, [{ count: 1 }])
      }
      assert.isDefined(binding)
      if (binding === undefined) throw new Error("Missing private OAuth request binding")

      const callback = {
        flowId: begun.flowId,
        provider: "strava",
        callbackId: "strava",
        requestBinding: Redacted.value(binding),
        response: { _tag: "Code" as const, code: "provider-code", state: "A".repeat(43) }
      }

      const completed = yield* auth
        .completeSignIn(callback)
        .pipe(Effect.provideService(Auth.AuthRequest, request))

      assert.containsSubset(completed, {
        returnTarget: "/activities",
        completion: {
          _tag: "Authenticated",
          session: { subjectId: "athlete", claims: { displayName: "Ada Athlete" } }
        }
      })
      assert.notProperty(completed, "credentialCommands")
      const session = delivered.get("session")

      assert.isDefined(session)
      if (session === undefined) throw new Error("Missing private session credential")
      assert.strictEqual((yield* auth.verifySession(session)).subjectId, "athlete")
      if (sessionMode === "stateless") {
        assert.deepStrictEqual(
          yield* sql`select name from sqlite_master where type = 'table' and name = 'auth_sessions'`,
          []
        )
        assert.deepStrictEqual(yield* sql`select count(*) as count from ${sql(flowTable)}`, [{ count: 0 }])
      }

      const replay = yield* auth
        .completeSignIn(callback)
        .pipe(Effect.provideService(Auth.AuthRequest, request), Effect.result)

      assert.containsSubset(replay, { _tag: "Failure", failure: { _tag: "OAuthRejected" } })
      assert.strictEqual(exchanges, 1)
      const resolved = yield* fixture.signIn.resolve({ moduleId, identity })
      assert.containsSubset(resolved, {
        credentialId: imported.credentialId,
        revision: { subjectId: "athlete" }
      })
      assert.isString(resolved?.revision.securityRevision)
      assert.isUndefined(
        yield* fixture.signIn.resolve({
          moduleId,
          identity: { ...identity, subject: "unknown-athlete" }
        })
      )
      fixture.assertBatchExecution()
    }),
  { timeout: 30_000 }
)

it.live.each(backends)(
  "%s managed retained OAuth persists connected flows, grants and revocation custody",
  (backend) =>
    Effect.gen(function*() {
      const fixture = yield* setup(backend, true)
      const connected = requiredService(fixture.context, OAuth.OAuthConnectedPersistence)
      const revocations = requiredService(fixture.context, OAuth.OAuthConnectedRevocations)
      const credential = yield* fixture.signIn.resolve({ moduleId, identity })

      assert.isDefined(credential)
      if (credential === undefined) throw new Error("Missing existing OAuth credential")
      const now = DateTime.toEpochMillis(yield* DateTime.now)

      const flow = yield* Schema.decodeEffect(OAuth.OAuthSignInFlow)({
        context: {
          ...configuration,
          namespace: "effect-auth/oauth-sign-in-context/v1",
          moduleId,
          generation: 1,
          flowId: "retained-sign-in",
          access: profile,
          returnTarget: "/activities",
          stateDigest: "A".repeat(43),
          requestBindingVerifier: "B".repeat(43),
          requestBindingExpiresAtMillis: now + 300_000,
          issuedAtMillis: now,
          expiresAtMillis: now + 300_000,
          exchangeTimeoutMillis: 30_000
        },
        sealed: {
          format: "oauth-xchacha20poly1305-v1",
          keyId: "test",
          nonce: "A".repeat(32),
          ciphertext: "A".repeat(22)
        }
      })

      const authorization = yield* Schema.decodeEffect(OAuth.OAuthConnectedActionAuthorization)({
        challenge: {
          moduleId,
          action: "connected-begin",
          flowId: "connect-activity",
          revision: credential.revision,
          intentDigest: "A".repeat(43),
          bindingDigest: "A".repeat(43)
        },
        source: { _tag: "Proof" },
        validUntilMillis: now + 300_000,
        evidence: {
          revision: credential.revision,
          flowId: "connect-activity",
          bindingDigest: "A".repeat(43),
          proofs: [
            {
              method: "oauth",
              credentialId: "strava-login",
              factors: ["possession"],
              userVerified: false,
              phishingResistant: false,
              verifiedAt: now
            }
          ]
        },
        requirement
      })

      const connectedFlow = OAuth.OAuthConnectedFlow.make({
        context: {
          ...flow.context,
          namespace: "effect-auth/oauth-connected-context/v1",
          flowId: authorization.challenge.flowId,
          revision: credential.revision,
          profile,
          grantId: OAuth.OAuthGrantId.make("activity-grant"),
          maximumEvidenceAgeMillis: 300_000,
          authorization
        },
        sealed: flow.sealed
      })

      assert.strictEqual((yield* (yield* connected.issue(connectedFlow, prepare)).read)._tag, "Issued")

      const access = {
        ...connectedFlow.context,
        subjectId: credential.revision.subjectId
      }

      assert.strictEqual((yield* (yield* connected.consume(access, prepare)).read)._tag, "Consumed")
      assert.strictEqual((yield* (yield* connected.consume(access, prepare)).read)._tag, "Rejected")

      const context = yield* Schema.decodeEffect(OAuth.OAuthConnectedTokenContext)({
        namespace: "effect-auth/oauth-connected-token-context/v1",
        moduleId,
        subjectId: credential.revision.subjectId,
        identity,
        configuration: { ...configuration, profile },
        grantId: "activity-grant",
        grantVersion: "grant-v1",
        tokenVersion: "token-v1",
        metadata: {
          scopes: ["activity:read"],
          resources: [],
          accessExpiresAtMillis: now + 3_600_000,
          refreshExpiresAtMillis: now + 86_400_000,
          useUntilMillis: now + 3_600_000,
          refreshUseUntilMillis: now + 86_400_000,
          obtainedAtMillis: now
        }
      })

      const tokenServices = yield* Layer.build(
        OAuth.OAuthConnectedTokenProtector.layer({
          activeKeyId: "test",
          keys: [{ id: "test", material: Redacted.make("B".repeat(42) + "A") }]
        }).pipe(
          Layer.provideMerge(
            Layer.merge(Kdf.layerPortable, KdfAdmission.layer())
          ),
          Layer.provide(Layer.succeedContext(fixture.context))
        )
      )

      const protector = Context.get(tokenServices, OAuth.OAuthConnectedTokenProtector)

      const material = yield* Schema.decodeEffect(OAuth.OAuthConnectedTokenMaterial)({
        namespace: "effect-auth/oauth-connected-token-material/v1",
        accessToken: "retained-access-token",
        refreshToken: "retained-refresh-token",
        continuation: { _tag: "OAuth" }
      })

      const grant = OAuth.OAuthConnectedStoredGrant.make({
        context,
        sealed: yield* protector.seal({ context, material })
      })

      const settled = yield* connected.settle({ _tag: "SignIn", flow, credential, grant }, prepare)

      assert.strictEqual((yield* settled.read)._tag, "Connected")

      const key = {
        moduleId,
        subjectId: credential.revision.subjectId,
        grantId: grant.context.grantId
      }

      const read = { ...key, selector: { _tag: "Grant" as const, grantId: key.grantId } }
      const stored = yield* connected.read(read)

      assert.deepStrictEqual(stored?.grant?.context, grant.context)
      assert.strictEqual(Redacted.value(stored!.grant!.sealed.ciphertext), Redacted.value(grant.sealed.ciphertext))

      // Regression in ddd5363: fresh-token access skipped the managed policy revision binding.
      let policyRevision = credential.revision.securityRevision
      const unexpectedProviderCall = Effect.die("Fresh-token use must not contact the provider")
      const accessModule = RetainedFitness.strategies.strava.access

      const accessServices = yield* Layer.build(
        accessModule.accessLayer.pipe(
          Layer.provide(
            Layer.succeed(OAuth.OAuthConnectedUseAuthority, {
              authorize: (input) =>
                input.purpose === "use"
                  ? Effect.succeed(
                    OAuth.OAuthConnectedUseAuthorization.make({
                      moduleId: input.moduleId,
                      revision: input.captured.revision,
                      policyRevision,
                      expiresAtMillis: OAuth.OAuthInstant.make(now + 300_000),
                      purpose: "use",
                      grantId: input.grantId,
                      profileKey: input.profileKey
                    })
                  )
                  : Effect.fail(OAuth.OAuthUnavailable.make({}))
            })
          ),
          Layer.provide(
            Layer.succeed(OAuth.OAuthConnectedProtocol, {
              prepareAuthorization: () => unexpectedProviderCall,
              exchangeGrant: () => unexpectedProviderCall,
              refreshGrant: () => unexpectedProviderCall,
              revokeGrant: () => unexpectedProviderCall
            })
          ),
          Layer.provide(Layer.succeedContext(Context.merge(fixture.context, tokenServices)))
        )
      )

      const tokenAccess = Context.get(accessServices, accessModule.ConnectedAccess)
      let tokenUses = 0

      const useToken = tokenAccess.withAccessToken(
        {
          _tag: "Authenticated",
          subjectId: key.subjectId,
          assurance: Operations.AuthenticationAssurance.make({
            method: "oauth",
            factors: ["possession"],
            authenticatedAt: DateTime.makeUnsafe(now)
          })
        },
        { grantId: key.grantId, profileKey: profile.key },
        (token) =>
          Effect.sync(() => {
            tokenUses++

            return Redacted.value(token)
          })
      )

      assert.strictEqual(yield* useToken, "retained-access-token")
      policyRevision = Sessions.SecurityRevision.make("independent-policy")
      assert.containsSubset(yield* Effect.result(useToken), {
        _tag: "Failure",
        failure: { _tag: "OAuthRejected" }
      })
      assert.strictEqual(tokenUses, 1)

      const disconnected = yield* connected.disconnect(
        {
          key,
          grantVersion: grant.context.grantVersion,
          authorization: {
            ...authorization,
            challenge: { ...authorization.challenge, action: "connected-disconnect" }
          }
        },
        prepare
      )

      assert.deepStrictEqual(yield* disconnected.read, {
        _tag: "Disconnected",
        grantId: key.grantId,
        remoteRevocation: "Pending"
      })
      assert.isUndefined((yield* connected.read(read))?.grant)

      const claimed = yield* (yield* revocations.claim(
        {
          moduleId,
          claimId: OAuth.OAuthClaimId.make("C".repeat(43)),
          lifetimeMillis: 30_000
        },
        prepare
      )).read

      assert.strictEqual(claimed._tag, "Claimed")
      if (claimed._tag !== "Claimed") throw new Error("Missing durable revocation job")
      assert.deepStrictEqual(claimed.claim.job.grant.context, grant.context)
      assert.strictEqual(
        Redacted.value(claimed.claim.job.grant.sealed.ciphertext),
        Redacted.value(grant.sealed.ciphertext)
      )
      assert.deepStrictEqual(
        yield* (yield* revocations.settle(
          {
            claim: claimed.claim,
            outcome: "Confirmed"
          },
          prepare
        )).read,
        { settled: true }
      )
      assert.strictEqual(
        (yield* (yield* revocations.claim(
          {
            moduleId,
            claimId: OAuth.OAuthClaimId.make("D".repeat(43)),
            lifetimeMillis: 30_000
          },
          prepare
        )).read)._tag,
        "Empty"
      )
      assert.isDefined(yield* fixture.signIn.resolve({ moduleId, identity }))
      fixture.assertBatchExecution()
    }),
  { timeout: 30_000 }
)
