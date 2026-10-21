import * as Hooks from "@effect/auth/Hooks"
import * as Proofs from "@effect/auth/Proofs"
import { assert, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"

import * as Testing from "@effect/auth-persistence/Testing"
import * as Mac from "effect/crypto/Mac"
import { authority as sqliteAuthority } from "./fixtures/ProofAuthority.ts"

// Human-requested security regression: provider latency must not reveal proof eligibility.
const proofs = Proofs.make({
  namespace: "test/delivery-response",
  purpose: Proofs.ProofPurpose.make("phone-sign-in"),
  binding: Proofs.IdentifierProofBinding,
  channel: "sms",
  secret: { _tag: "Token" },
  policy: {
    ...Proofs.defaultProofPolicy,
    abuse: { ...Proofs.defaultProofPolicy.abuse, resendCooldownMillis: 0 }
  }
})

const base = Layer.mergeAll(
  Mac.layerWebCrypto.pipe(Layer.provideMerge(Testing.services({ seed: "proof-delivery" }))),
  Hooks.LifecycleHooks.empty,
  Proofs.ProofKeys.layer({
    activeKeyId: "test",
    keys: [{ id: "test", material: Redacted.make("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") }]
  })
)

const authority = sqliteAuthority.pipe(Layer.provide(base))
const invocation = { _tag: "System", authority: "test-method" } as const

const input = (requestId: string, eligible = true) => ({
  requestId: Proofs.ProofRequestId.make(requestId),
  binding: {
    _tag: "Identifier" as const,
    flowId: requestId,
    contextDigest: "delivery-regression",
    identifier: { namespace: "phone", value: "+15555550123" }
  },
  locale: "en",
  eligible
})

it.effect("delivers outside the request scope without an application scheduler", () =>
  Effect.gen(function*() {
    const providerEntered = yield* Deferred.make<void>()
    const providerRelease = yield* Deferred.make<void>()
    const providerCompleted = yield* Deferred.make<void>()

    const delivery = Proofs.SmsProofDelivery.layer(() =>
      Effect.gen(function*() {
        yield* Deferred.succeed(providerEntered, undefined)
        yield* Deferred.await(providerRelease)
        yield* Deferred.succeed(providerCompleted, undefined)

        return { _tag: "Accepted" as const }
      })
    )

    const live = proofs.handlersLayer.pipe(
      Layer.provide(proofs.smsLayer),
      Layer.provide([base, authority, delivery])
    )

    yield* Effect.gen(function*() {
      const response = yield* proofs.operations.Request.invoke(invocation, input("default")).pipe(
        Effect.scoped,
        Effect.timeout("1 second"),
        Effect.result,
        Effect.forkChild
      )

      yield* Deferred.await(providerEntered)
      yield* TestClock.adjust("1 second")
      const result = yield* Fiber.join(response)

      assert.strictEqual(result._tag, "Success")
      if (result._tag !== "Success") return
      assert.strictEqual(result.success.requestId, "default")
      assert.strictEqual(yield* Deferred.isDone(providerCompleted), false)

      // The request scope has closed; the application's default worker is still alive.
      yield* Deferred.succeed(providerRelease, undefined)
      yield* Deferred.await(providerCompleted)
    }).pipe(Effect.provide(live))
  }))

it.effect("keeps delivery alive after a task interrupts while retaining scoped shutdown", () =>
  Effect.gen(function*() {
    const firstStarted = yield* Deferred.make<void>()
    const completed = yield* Deferred.make<void>()
    const inFlight = yield* Deferred.make<void>()
    const finalized = yield* Deferred.make<void>()

    const scheduler = yield* Effect.gen(function*() {
      const scheduler = yield* Proofs.ProofDispatchScheduler

      yield* scheduler.schedule(
        Deferred.succeed(firstStarted, undefined).pipe(Effect.andThen(Effect.interrupt))
      )
      yield* Deferred.await(firstStarted)
      yield* scheduler.schedule(Deferred.succeed(completed, undefined).pipe(Effect.asVoid))

      const waiting = yield* Deferred.await(completed).pipe(
        Effect.timeout("1 second"),
        Effect.result,
        Effect.forkChild
      )

      yield* TestClock.adjust("1 second")
      assert.strictEqual((yield* Fiber.join(waiting))._tag, "Success")

      yield* scheduler.schedule(
        Deferred.succeed(inFlight, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(finalized, undefined))
        )
      )
      yield* Deferred.await(inFlight)

      return scheduler
    }).pipe(Effect.provide(Proofs.ProofDispatchScheduler.layer))

    assert.strictEqual(yield* Deferred.isDone(finalized), true)
    assert.instanceOf(yield* scheduler.schedule(Effect.void).pipe(Effect.flip), Proofs.ProofUnavailable)
  }))

it.effect("returns every committed receipt before host-owned delivery completes", () =>
  Effect.gen(function*() {
    const reachedBoundary = yield* Deferred.make<void>()
    const providerEntered = yield* Deferred.make<void>()
    const providerRelease = yield* Deferred.make<void>()
    const pending: Array<Effect.Effect<void>> = []
    let sends = 0

    const host = Layer.succeed(Proofs.ProofDispatchScheduler, {
      schedule: (work) =>
        Effect.suspend(() =>
          pending.length === 3
            ? Proofs.ProofUnavailable.make({})
            : Effect.sync(() => pending.push(work)).pipe(
              Effect.andThen(Deferred.succeed(reachedBoundary, undefined)),
              Effect.asVoid
            )
        )
    })

    const delivery = Proofs.SmsProofDelivery.layer(() =>
      Effect.gen(function*() {
        sends++
        yield* Deferred.succeed(reachedBoundary, undefined)
        yield* Deferred.succeed(providerEntered, undefined)
        yield* Deferred.await(providerRelease)

        return { _tag: "Accepted" as const }
      })
    )

    const live = proofs.handlersLayer.pipe(
      Layer.provide(proofs.smsLayer),
      Layer.provide([base, authority, delivery, host])
    )

    yield* Effect.gen(function*() {
      const request = proofs.operations.Request.invoke(invocation, input("eligible"))

      const response = yield* request.pipe(
        Effect.scoped,
        Effect.timeout("1 second"),
        Effect.result,
        Effect.forkChild
      )

      yield* Deferred.await(reachedBoundary)
      yield* TestClock.adjust("1 second")
      const result = yield* Fiber.join(response)

      assert.strictEqual(result._tag, "Success")
      if (result._tag !== "Success") return
      assert.strictEqual(yield* Deferred.isDone(providerEntered), false)

      const reissued = yield* request

      const suppressed = yield* proofs.operations.Request.invoke(
        invocation,
        input("suppressed", false)
      )

      assert.notDeepEqual(reissued.reference, result.success.reference)
      assert.strictEqual(suppressed.requestId, "suppressed")
      assert.lengthOf(pending, 3)

      for (const eligible of [false, true]) {
        const full = input(`full-${eligible}`, eligible)

        assert.instanceOf(
          yield* proofs.operations.Request.invoke(invocation, {
            ...full,
            binding: { ...full.binding, identifier: { namespace: "phone", value: "+15555550124" } }
          }).pipe(Effect.flip),
          Proofs.ProofUnavailable
        )
      }

      // The request scope has closed. The host now owns delivery and its lifetime.
      const drain = yield* Effect.forEach(pending, (work) => work).pipe(Effect.forkChild)

      yield* Deferred.await(providerEntered)
      assert.strictEqual(sends, 1)
      yield* Deferred.succeed(providerRelease, undefined)
      yield* Fiber.join(drain)
      assert.strictEqual(sends, 2)
    }).pipe(Effect.provide(live))
  }))

it.effect("contains private provider defects inside the host-owned task", () =>
  Effect.gen(function*() {
    const pending: Array<Effect.Effect<void>> = []
    const logs: Array<string> = []

    const logger = Logger.make((entry) => logs.push(JSON.stringify(Logger.formatStructured.log(entry))))

    const live = proofs.handlersLayer.pipe(
      Layer.provide(proofs.smsLayer),
      Layer.provide([
        base,
        authority,
        Layer.succeed(Proofs.ProofDispatchScheduler, {
          schedule: (work) =>
            Effect.sync(() => {
              pending.push(work)
            })
        }),
        Proofs.SmsProofDelivery.layer(() => Effect.die(new Error("private-provider-body-marker")))
      ])
    )

    yield* Effect.gen(function*() {
      const receipt = yield* proofs.operations.Request.invoke(invocation, input("provider-defect"))

      assert.strictEqual(receipt.requestId, "provider-defect")
      assert.lengthOf(pending, 1)
      yield* Effect.forEach(pending, (work) => work)
      assert.include(logs.join(" "), "Auth proof-delivery failed")
      assert.notInclude(logs.join(" "), "private-provider-body-marker")
    }).pipe(Effect.provide([live, Logger.layer([logger])]))
  }))

it.effect("does not schedule delivery after an unknown commit", () =>
  Effect.gen(function*() {
    const pending: Array<Effect.Effect<void>> = []
    let loseAcknowledgement = true
    let sends = 0

    const uncertain = Layer.effect(
      Proofs.ProofPersistence,
      Effect.gen(function*() {
        const store = yield* Proofs.ProofPersistence

        return Proofs.ProofPersistence.of({
          ...store,
          issue: (request, prepare) =>
            store.issue(request, prepare).pipe(
              Effect.flatMap((receipt) => {
                if (loseAcknowledgement) {
                  loseAcknowledgement = false

                  return Proofs.ProofUnavailable.make({})
                }

                return Effect.succeed(receipt)
              })
            )
        })
      })
    ).pipe(Layer.provide(authority))

    const live = proofs.handlersLayer.pipe(
      Layer.provide(proofs.smsLayer),
      Layer.provide([
        base,
        uncertain,
        Layer.succeed(Proofs.ProofDispatchScheduler, {
          schedule: (work) =>
            Effect.sync(() => {
              pending.push(work)
            })
        }),
        Proofs.SmsProofDelivery.layer(() =>
          Effect.sync(() => {
            sends++

            return { _tag: "Accepted" as const }
          })
        )
      ])
    )

    yield* Effect.gen(function*() {
      const request = proofs.operations.Request.invoke(invocation, input("unknown"))

      assert.instanceOf(yield* request.pipe(Effect.flip), Proofs.ProofUnavailable)
      assert.lengthOf(pending, 0)
      assert.strictEqual(sends, 0)
    }).pipe(Effect.provide(live))
  }))
