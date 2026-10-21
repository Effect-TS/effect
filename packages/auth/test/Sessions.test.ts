import { coordinateCommit, LifecycleHooks } from "@effect/auth/Hooks"
import { SubjectId, TokenDigest } from "@effect/auth/Schema"
import * as Sessions from "@effect/auth/Sessions"
import { layerWebCrypto } from "@effect/auth/WebCrypto"
import { assert, it } from "@effect/vitest"
import { DateTime, Deferred, Effect, Exit, Fiber, Layer, Redacted, Schema, Scope } from "effect"
import { Mac } from "effect/crypto"
import { TestClock } from "effect/testing"

const subjectId = SubjectId.make("actor-session-audience-regression")
const sessions = Sessions.make(Schema.Struct({}), { namespace: "test/audience" })

const keys: Sessions.SessionSigningKeyring = {
  activeKeyId: "test",
  keys: [{ id: "test", material: Redacted.make("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") }]
}

const sessionLayer = (audience: string) =>
  sessions
    .statelessLayer(
      Sessions.stateless({ issuer: "kommunikasie", audience }).policy(sessions.moduleId)
    )
    .pipe(
      Layer.provide([
        layerWebCrypto,
        LifecycleHooks.empty,
        Layer.succeed(Sessions.SessionSigningKeys, keys)
      ])
    )

const requirement = Sessions.AuthenticationRequirement.make({
  alternatives: [
    {
      factors: ["knowledge"],
      userVerified: false,
      phishingResistant: false,
      minimumCredentials: 1
    }
  ],
  maximumAgeMillis: 60_000
})

const authority = Layer.succeed(Sessions.AuthenticationAuthority, {
  capture: () => Effect.die("This regression supplies trusted method evidence directly"),
  requirements: () => Effect.succeed(requirement),
  approve: (_input, prepare) =>
    coordinateCommit((journal) => Effect.sync(() => prepare(undefined, journal))).pipe(
      Effect.map((result) => result.value),
      Effect.orDie,
      Effect.provide(LifecycleHooks.empty)
    )
})

const issue = Effect.fnUntraced(
  function*(_audience: string) {
    const strategy = yield* sessions.SessionStrategy

    const evidence = Sessions.AuthenticationEvidence.make({
      revision: {
        subjectId,
        securityRevision: Sessions.SecurityRevision.make("1"),
        credentials: [{ credentialId: "password", revision: Sessions.SecurityRevision.make("1") }]
      },
      flowId: Sessions.AuthenticationFlowId.make("audience-regression"),
      bindingDigest: TokenDigest.make("audience-regression-binding"),
      proofs: [
        {
          method: "password",
          credentialId: "password",
          factors: ["knowledge"],
          userVerified: false,
          phishingResistant: false,
          verifiedAt: yield* DateTime.now
        }
      ]
    })

    const prepared = yield* strategy.prepareEstablish({ evidence, requirement, claims: {} })
    const issued = yield* prepared.read
    const command = issued.credentialCommands.find((command) => command._tag === "Issue")

    if (command === undefined) return yield* Effect.die("Session issuance omitted its credential")

    return command.credential
  },
  (effect, audience) => effect.pipe(Effect.provide([sessionLayer(audience), authority]))
)

const verify = (token: Redacted.Redacted<string>, audience: string) =>
  Effect.flatMap(
    sessions.SessionStrategy,
    (strategy) => strategy.inspect(token).pipe(Effect.map((source) => source.inspection.session))
  ).pipe(Effect.provide(sessionLayer(audience)))

// Preserve the existing audience-isolation regression at the current session boundary.
// Shared keys isolate the audience check from signature rejection.
it.effect("rejects another audience even when the signing key is shared", () =>
  Effect.gen(function*() {
    const production = yield* issue("kommunikasie")

    assert.strictEqual((yield* verify(production, "kommunikasie")).subjectId, subjectId)
    assert.instanceOf(yield* Effect.flip(verify(production, "kommunikasie-preview:pr-101")), Sessions.SessionInvalid)
  }))

// Requested hardening: an unrevocable default credential must expire promptly.
it.effect("expires a default stateless credential after fifteen minutes", () =>
  Effect.gen(function*() {
    const token = yield* issue("kommunikasie")

    assert.strictEqual((yield* verify(token, "kommunikasie")).subjectId, subjectId)
    yield* TestClock.adjust("15 minutes")
    assert.instanceOf(yield* Effect.flip(verify(token, "kommunikasie")), Sessions.SessionInvalid)
  }))

// Native MAC keys remain usable as values, so the codec owns its lifetime boundary.
it.effect("joins active signing before retiring the codec and rejects later use", () =>
  Effect.gen(function*() {
    const owner = yield* Scope.fork(yield* Effect.scope)
    const mac = yield* Mac.Mac
    const entered = yield* Deferred.make<void>()
    const finish = yield* Deferred.make<void>()
    const codec = yield* Sessions.makeSessionSigningCodec(Schema.String, keys, 4096).pipe(
      Effect.provideService(Scope.Scope, owner),
      Effect.provideService(Mac.Mac, {
        ...mac,
        sign: (key, message) =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Deferred.await(finish)),
            Effect.andThen(mac.sign(key, message))
          )
      })
    )

    const signing = yield* codec.encode("claims").pipe(Effect.forkChild)
    yield* Deferred.await(entered)
    const closing = yield* Scope.close(owner, Exit.void).pipe(Effect.forkChild)
    yield* TestClock.adjust(1)
    assert.isUndefined(closing.pollUnsafe())

    yield* Deferred.succeed(finish, undefined)
    yield* Fiber.join(closing)
    assert.isTrue(Exit.isFailure(yield* Fiber.await(signing)))
    assert.instanceOf(yield* Effect.flip(codec.encode("late")), Sessions.SessionUnavailable)
  }).pipe(Effect.provide(layerWebCrypto)))
