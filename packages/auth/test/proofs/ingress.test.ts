import * as Auth from "@effect/auth/Auth"
import * as Email from "@effect/auth/Email"
import * as Password from "@effect/auth/Password"
import * as Proofs from "@effect/auth/Proofs"
import * as Sessions from "@effect/auth/Sessions"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import { RateLimiter } from "effect/persistence"
import { TestClock } from "effect/testing"

export const app = Auth.make("test/proof-ingress", {
  claims: Schema.Struct({}),
  sessions: Sessions.stateful(),
  defaultStrategy: "email",
  strategies: {
    email: Email.makeCode(),
    password: Password.make({
      registration: Schema.Struct({}),
      reset: Password.resetLink({ url: "https://example.test/reset" })
    })
  }
})

const request = {
  flowId: "flow",
  requestBinding: "binding",
  requestId: "request",
  email: "person@example.test",
  returnTarget: "/",
  locale: "en"
}

const guest = { _tag: "Guest" } as const

// Requested security regression: ingress must reject before a proof-request
// handler can perform target lookup or persistence, using each invocation's keys.
it.effect(
  "authorizes email issue and repeated requests with the current trusted network context",
  () =>
    Effect.gen(function*() {
      const { Request } = app.strategies.email.operations
      const seen: Array<{ action: string; network: string; device: string | undefined }> = []
      let entered = 0

      const handler = Effect.sync(() => {
        entered++
      }).pipe(Effect.andThen(Effect.fail(Email.EmailUnavailable.make({}))))

      const handlers = yield* Layer.build(Request.handlerLayer(() => handler))

      const limiter = Proofs.HostIngressLimiter.of({
        check: Effect.fnUntraced(function*(input) {
          const network = Redacted.value(input.networkKey)

          seen.push({
            action: input.action,
            network,
            device: input.deviceKey === undefined ? undefined : Redacted.value(input.deviceKey)
          })
          if (network === "blocked") return yield* Proofs.ProofIngressDenied.make({})
        })
      })

      const denied = yield* Request.invoke(guest, request).pipe(
        Effect.provide(handlers),
        Effect.provideService(Proofs.HostIngressLimiter, limiter),
        Effect.provideService(
          Proofs.ProofRequestContext,
          Effect.succeed({ networkKey: Redacted.make("blocked") })
        ),
        Effect.result
      )

      const afterDenied = entered

      const admitted = yield* Request.invoke(guest, request).pipe(
        Effect.provide(handlers),
        Effect.provideService(Proofs.HostIngressLimiter, limiter),
        Effect.provideService(
          Proofs.ProofRequestContext,
          Effect.succeed({
            networkKey: Redacted.make("allowed"),
            deviceKey: Redacted.make("trusted-device")
          })
        ),
        Effect.result
      )

      const resent = yield* Request.invoke(guest, request).pipe(
        Effect.provide(handlers),
        Effect.provideService(Proofs.HostIngressLimiter, limiter),
        Effect.provideService(
          Proofs.ProofRequestContext,
          Effect.succeed({ networkKey: Redacted.make("blocked") })
        ),
        Effect.result
      )

      assert.deepInclude(denied, { _tag: "Failure" })
      assert.nestedPropertyVal(denied, "failure._tag", "EmailRejected")
      assert.strictEqual(afterDenied, 0)
      assert.deepInclude(admitted, { _tag: "Failure" })
      assert.nestedPropertyVal(admitted, "failure._tag", "EmailUnavailable")
      assert.deepInclude(resent, { _tag: "Failure" })
      assert.nestedPropertyVal(resent, "failure._tag", "EmailRejected")
      assert.strictEqual(entered, 1)
      assert.deepEqual(seen, [
        { action: "test/proof-ingress/email/code/sign-in", network: "blocked", device: undefined },
        {
          action: "test/proof-ingress/email/code/sign-in",
          network: "allowed",
          device: "trusted-device"
        },
        { action: "test/proof-ingress/email/code/sign-in", network: "blocked", device: undefined }
      ])
    })
)

it.effect(
  "rejects password reset ingress before its handler and fails closed on limiter outage",
  () =>
    Effect.gen(function*() {
      const { RequestReset } = app.strategies.password.operations
      let entered = 0
      const seen: Array<string> = []

      const handlers = yield* Layer.build(
        RequestReset.handlerLayer(() =>
          Effect.sync(() => {
            entered++
          }).pipe(Effect.andThen(Effect.fail(Password.PasswordUnavailable.make({}))))
        )
      )

      const limiter = Proofs.HostIngressLimiter.of({
        check: Effect.fnUntraced(function*({ networkKey }) {
          const network = Redacted.value(networkKey)

          seen.push(network)

          return yield* network === "blocked"
            ? Proofs.ProofIngressDenied.make({})
            : Proofs.ProofUnavailable.make({})
        })
      })

      const denied = yield* RequestReset.invoke(guest, request).pipe(
        Effect.provide(handlers),
        Effect.provideService(Proofs.HostIngressLimiter, limiter),
        Effect.provideService(
          Proofs.ProofRequestContext,
          Effect.succeed({ networkKey: Redacted.make("blocked") })
        ),
        Effect.result
      )

      const unavailable = yield* RequestReset.invoke(guest, request).pipe(
        Effect.provide(handlers),
        Effect.provideService(Proofs.HostIngressLimiter, limiter),
        Effect.provideService(
          Proofs.ProofRequestContext,
          Effect.succeed({ networkKey: Redacted.make("outage") })
        ),
        Effect.result
      )

      assert.deepInclude(denied, { _tag: "Failure" })
      assert.nestedPropertyVal(denied, "failure._tag", "PasswordRejected")
      assert.deepInclude(unavailable, { _tag: "Failure" })
      assert.nestedPropertyVal(unavailable, "failure._tag", "PasswordUnavailable")
      assert.strictEqual(entered, 0)
      assert.deepEqual(seen, ["blocked", "outage"])
    })
)

// Requested configurable defaults: separately built limiters must honor a supplied
// shared store; changing purpose or device cannot create another network allowance.
it.effect("shares a configured network allowance through the supplied store and refills it", () =>
  Effect.gen(function*() {
    const store = yield* Layer.build(RateLimiter.layerStoreMemory)

    const check = (network: string, action: string, device: string) =>
      Effect.flatMap(Proofs.HostIngressLimiter, (limiter) =>
        limiter.check({
          action,
          networkKey: Redacted.make(network),
          deviceKey: Redacted.make(device)
        })).pipe(
          Effect.provide(
            Proofs.HostIngressLimiter.layer({ limit: 2, windowMillis: 1000 }).pipe(
              Layer.provide(Layer.succeedContext(store))
            )
          ),
          Effect.result
        )

    assert.strictEqual((yield* check("caller", "email", "first"))._tag, "Success")
    assert.strictEqual((yield* check("caller", "reset", "second"))._tag, "Success")
    assert.deepInclude(yield* check("caller", "email", "third"), { _tag: "Failure" })
    assert.nestedPropertyVal(yield* check("caller", "email", "third"), "failure._tag", "ProofIngressDenied")
    assert.strictEqual((yield* check("another-caller", "reset", "first"))._tag, "Success")
    yield* TestClock.adjust("500 millis")
    assert.strictEqual((yield* check("caller", "reset", "fourth"))._tag, "Success")
  }))
