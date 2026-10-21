import * as Auth from "@effect/auth/Auth"
import * as Hooks from "@effect/auth/Hooks"
import { AuthenticationAssurance } from "@effect/auth/Operations"
import * as Passkey from "@effect/auth/Passkey"
import { SubjectId } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import { assert, it } from "@effect/vitest"
import * as Array from "effect/Array"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import * as TestClock from "effect/testing/TestClock"

import * as Testing from "@effect/auth-persistence/Testing"
import * as Mac from "effect/crypto/Mac"
import * as Tables from "./fixtures/PasskeyClock.ts"

const claims = Schema.Struct({})
const sessions = Sessions.make(claims)
const management = { ...Tables.management, requireImmediateInvalidation: false }

const module = Passkey.makeManagement({ policy: Tables.policy, management }).bind({
  namespace: Tables.moduleId,
  sessionNamespace: sessions.moduleId,
  sessions,
  claims
})

const keys = {
  activeKeyId: "test",
  keys: [{ id: "test", material: Redacted.make("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") }]
}

const verified = Passkey.PasskeyRegistrationVerified.make({
  protocolCredentialId: Passkey.PasskeyProtocolCredentialId.make("AQ"),
  publicKey: "AQ",
  algorithm: -7,
  userVerified: true,
  backupEligible: true,
  backupState: true,
  counter: 0
})

const harness = (
  options: {
    verify?: (
      input: Parameters<Passkey.PasskeyProtocol["Service"]["verifyRegistration"]>[0]
    ) => Effect.Effect<
      Passkey.PasskeyRegistrationVerified,
      Passkey.PasskeyProtocolRejected | Passkey.PasskeyUnavailable,
      SqlClient.SqlClient
    >
  } = {}
) => {
  const database = Layer.effectDiscard(
    Effect.gen(function*() {
      yield* Tables.migrate
      const sql = yield* SqlClient.SqlClient

      yield* sql`CREATE TABLE passkey_test_clock (millis INTEGER NOT NULL)`
      yield* sql`INSERT INTO passkey_test_clock VALUES (${DateTime.toEpochMillis(yield* DateTime.now)})`
      yield* sql`INSERT INTO passkey_subject VALUES ('account', 'active', '1', 'Example')`
      yield* sql`INSERT INTO passkey_factor VALUES ('account', 'existing-factor', '1', 'active')`
    })
  ).pipe(Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })))

  const storage = Layer.unwrap(
    Effect.map(Tables.services, (services) =>
      Layer.mergeAll(
        Layer.succeed(Passkey.PasskeyPersistence, services.passkeyPersistence),
        Layer.succeed(Passkey.PasskeyManagementPersistence, services.passkeyManagementPersistence),
        Layer.succeed(Passkey.PasskeyCredentials, services.passkeyCredentials)
      ))
  ).pipe(Layer.provideMerge(database))

  // Isolate independent clocks at the public workflow. The deployed reproducer
  // used a real synced ES256 virtual authenticator but failed before verification.
  const protocol = Layer.effect(
    Passkey.PasskeyProtocol,
    Effect.map(SqlClient.SqlClient, (sql) =>
      Passkey.PasskeyProtocol.of({
        prepareAuthentication: () => Effect.die("Not used by enrollment"),
        verifyAuthentication: () => Effect.die("Not used by enrollment"),
        prepareRegistration: ({
          profile,
          challenge,
          timeoutMillis,
          userHandle,
          name,
          displayName,
          excludedCredentials
        }) =>
          Effect.succeed(
            Passkey.PasskeyRegistrationOptions.make({
              challenge,
              rp: { id: profile.rpId, name: profile.rpName },
              user: { id: userHandle, name, displayName },
              pubKeyCredParams: Array.map(profile.algorithms, (alg) => ({
                type: "public-key" as const,
                alg
              })),
              timeout: timeoutMillis,
              attestation: "none",
              authenticatorSelection: { residentKey: "required", userVerification: "required" },
              excludeCredentials: excludedCredentials
            })
          ),
        verifyRegistration: (input) =>
          (options.verify?.(input) ?? Effect.succeed(verified)).pipe(
            Effect.provideService(SqlClient.SqlClient, sql)
          )
      }))
  )

  const action = Layer.succeed(Passkey.PasskeyActionEvidence, {
    verify: ({ challenge }) =>
      Effect.succeed({
        requirement: Tables.requirement,
        evidence: Passkey.PasskeyEvidence.make({
          revision: challenge.revision,
          flowId: Sessions.AuthenticationFlowId.make(challenge.flowId),
          bindingDigest: challenge.bindingDigest,
          proofs: [
            {
              method: "existing-factor",
              credentialId: "existing-factor",
              factors: ["possession"],
              userVerified: true,
              phishingResistant: true,
              verifiedAt: DateTime.makeUnsafe(0)
            }
          ]
        })
      })
  })

  return module.layer.pipe(
    Layer.provide(module.binding.layer),
    Layer.provide(sessions.statelessLayer(Sessions.stateless().policy(sessions.moduleId))),
    Layer.provide([
      protocol,
      Layer.succeed(Sessions.SessionSigningKeys, keys),
      action,
      Auth.RequestBindingConfig.layer({ generation: 1, lifetimeMillis: 300000, keyring: keys }),
      Passkey.PasskeyConfig.layer({ profiles: [Tables.profile] })
    ]),
    Layer.provideMerge(storage),
    Layer.provide([
      Mac.layerWebCrypto.pipe(Layer.provideMerge(Testing.services({ seed: "passkey-clock" }))),
      Hooks.LifecycleHooks.empty
    ])
  )
}

const start = Effect.gen(function*() {
  const service = yield* module.Management

  const caller = {
    _tag: "Authenticated" as const,
    subjectId: SubjectId.make("account"),
    assurance: AuthenticationAssurance.make({
      method: "existing-factor",
      factors: ["possession"],
      authenticatedAt: DateTime.makeUnsafe(0)
    })
  }

  const started = yield* service.begin(caller, {
    flowId: Passkey.PasskeyBegin.fields.flowId.make("enrollment"),
    commandId: Passkey.PasskeyBegin.fields.commandId.make("enrollment"),
    profileId: Tables.profile.profileId,
    name: "Synced ES256"
  })

  const binding = started.credentialCommands.find((command) => command._tag === "Issue")

  if (binding?._tag !== "Issue") return yield* Effect.die("Missing request binding")

  return {
    service,
    caller,
    complete: service.complete(caller, {
      flowId: started.value.flowId,
      bindingCredential: binding.credential,
      response: Redacted.make("registration-response")
    })
  }
})

// Regression: https://github.com/yielded-dev/auth/commit/2ff581d
// Real remote SQL clocks cannot be synchronized reliably in deployed acceptance.
it.effect.each([
  { applicationMillis: 0, databaseMillis: 242 },
  { applicationMillis: 80000, databaseMillis: 10000 }
])(
  "enrolls and lists a synced passkey with independent clocks %#",
  ({ applicationMillis, databaseMillis }) =>
    Effect.gen(function*() {
      const started = yield* start
      const sql = yield* SqlClient.SqlClient

      yield* TestClock.adjust(applicationMillis)
      yield* sql`UPDATE passkey_test_clock SET millis = ${databaseMillis}`
      const result = yield* started.complete

      assert.strictEqual(result.value.credential.name, "Synced ES256")
      assert.deepStrictEqual((yield* started.service.list(started.caller, { limit: 10 })).credentials, [
        result.value.credential
      ])
      assert.deepStrictEqual(yield* sql`SELECT algorithm, backupEligible, backupState FROM passkey_credential`, [{
        algorithm: -7,
        backupEligible: 1,
        backupState: 1
      }])
      assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "PasskeyRejected")
    }).pipe(Effect.provide(harness()))
)

it.effect("rejects enrollment when authority time expires the challenge during verification", () =>
  Effect.gen(function*() {
    const started = yield* start

    yield* (yield* SqlClient.SqlClient)`UPDATE passkey_test_clock SET millis = 242`
    assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "PasskeyRejected")
    assert.lengthOf((yield* started.service.list(started.caller, { limit: 10 })).credentials, 0)
    assert.strictEqual((yield* started.complete.pipe(Effect.flip))._tag, "PasskeyRejected")
  }).pipe(
    Effect.provide(
      harness({
        verify: Effect.fnUntraced(function*() {
          yield* (yield* SqlClient.SqlClient)`UPDATE passkey_test_clock SET millis = 120001`

          return verified
        }, Effect.orDie)
      })
    )
  ))
