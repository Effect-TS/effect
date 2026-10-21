import * as Testing from "@effect/auth-persistence/Testing"
import * as Auth from "@effect/auth/Auth"
import type * as Operations from "@effect/auth/Operations"
import * as Password from "@effect/auth/Password"
import * as Sessions from "@effect/auth/Sessions"
import { assert, it } from "@effect/vitest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"

// Requested public-import consumer test: exercise the helper through Auth, including
// acquisition isolation and Effect clock expiry, which adapter tests cannot prove.
const App = Auth.make("in-memory-example", {
  claims: Schema.Struct({ role: Schema.Literal("reader") }),
  sessions: Sessions.stateful({ idleTimeout: "10 minutes", maxAge: "1 hour" }),
  strategies: { password: Password.make() },
  defaultStrategy: "password"
})

const options = {
  subjects: [
    {
      subjectId: "reader",
      email: "reader@example.invalid",
      password: Redacted.make("test passphrase")
    }
  ],
  requirement: Sessions.AuthenticationRequirement.make({
    alternatives: [
      {
        factors: ["knowledge"],
        minimumCredentials: 1,
        userVerified: false,
        phishingResistant: false
      }
    ],
    maximumAgeMillis: 60_000
  })
}

const services = Testing.services({ seed: "in-memory-example" })
const memory = Testing.layer(App, options)

const live = App.layer.pipe(
  Layer.provide(
    Layer.succeed(App.strategies.password.SessionClaims, {
      resolve: () => Effect.succeed({ role: "reader" as const })
    })
  ),
  Layer.provideMerge(memory),
  Layer.provide(services)
)

it.effect("restarts seeded entropy for each service acquisition", () =>
  Effect.gen(function*() {
    const draw = Effect.gen(function*() {
      const random = yield* SecureRandom.SecureRandom
      return [yield* random.randomBytes(32), yield* random.randomBytes(32)]
    })

    const first = yield* draw.pipe(Effect.provide(Testing.services({ seed: "repeatable" })))
    const repeated = yield* draw.pipe(Effect.provide(Testing.services({ seed: "repeatable" })))
    const different = yield* draw.pipe(Effect.provide(Testing.services({ seed: "different" })))

    assert.deepStrictEqual(first, repeated)
    assert.notDeepEqual(first[0], first[1])
    assert.notDeepEqual(first, different)
  }))

it.effect(
  "signs in, rotates, revokes and expires sessions in isolated acquisitions",
  () =>
    Effect.gen(function*() {
      let credential: Redacted.Redacted<string> | undefined

      const call = (session?: Redacted.Redacted<string>) => ({
        credentials: session === undefined ? {} : { session },
        credentialCommandSink: (commands: ReadonlyArray<Operations.AuthCredentialCommand>) =>
          Effect.sync(() => {
            for (const command of commands) {
              if (command._tag === "Issue" && command.slot === "session") {
                credential = command.credential
              }
            }
          })
      })

      const signIn = { email: "reader@example.invalid", password: "test passphrase" }

      const first = yield* Effect.gen(function*() {
        const auth = yield* App

        assert.strictEqual(
          (yield* auth.signIn({ ...signIn, password: "wrong" }).pipe(Effect.flip))._tag,
          "PasswordRejected"
        )
        assert.isUndefined(credential)
        const result = yield* auth.signIn(signIn)

        assert.containsSubset(result, {
          _tag: "Authenticated",
          session: { subjectId: "reader", claims: { role: "reader" } }
        })
        assert.notProperty(result, "credentialCommands")
        const original = credential

        if (original === undefined) return yield* Effect.die("Missing private session credential")
        assert.strictEqual((yield* auth.verifySession(original)).subjectId, "reader")

        yield* TestClock.adjust("5 minutes")
        yield* auth.renewSession().pipe(Effect.provideService(Auth.AuthRequest, call(original)))
        assert.strictEqual((yield* auth.verifySession(original).pipe(Effect.flip))._tag, "SessionInvalid")
        assert.strictEqual(
          (yield* auth
            .renewSession()
            .pipe(Effect.provideService(Auth.AuthRequest, call(original)), Effect.flip))._tag,
          "SessionInvalid"
        )
        const renewed = credential

        if (renewed === undefined) return yield* Effect.die("Missing renewed credential")
        assert.containsSubset(yield* auth.signOut().pipe(Effect.provideService(Auth.AuthRequest, call(renewed))), {
          invalidation: "revoked"
        })
        assert.strictEqual((yield* auth.verifySession(renewed).pipe(Effect.flip))._tag, "SessionInvalid")

        yield* auth.signIn(signIn)
        if (credential === undefined) return yield* Effect.die("Missing new credential")

        return credential
      }).pipe(Effect.provideService(Auth.AuthRequest, call()), Effect.provide(live))

      // Reusing the same Layer value in a separate acquisition creates an empty session store.
      yield* Effect.gen(function*() {
        const auth = yield* App

        assert.strictEqual((yield* auth.verifySession(first).pipe(Effect.flip))._tag, "SessionInvalid")
        yield* auth.signIn(signIn)
        if (credential === undefined) return yield* Effect.die("Missing isolated credential")
        yield* TestClock.adjust("11 minutes")
        assert.strictEqual((yield* auth.verifySession(credential).pipe(Effect.flip))._tag, "SessionInvalid")
      }).pipe(Effect.provideService(Auth.AuthRequest, call()), Effect.provide(live))
    }),
  // Seeding and sign-in use the default Argon2 cost on the portable backend.
  { timeout: 30000 }
)

it.effect("rejects unsupported session modes at acquisition", () => {
  const signed = Auth.make("unsupported-memory-example", {
    claims: Schema.Struct({}),
    sessions: Sessions.stateless(),
    strategies: { password: Password.make() }
  })

  return Effect.gen(function*() {
    const error = yield* Effect.void.pipe(
      Effect.provide(Testing.layer(signed, options).pipe(Layer.provide(services))),
      Effect.flip
    )

    assert.strictEqual(error._tag, "PersistenceConfigurationError")
  })
})
