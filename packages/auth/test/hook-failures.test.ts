import { Hooks } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Logger } from "effect"
import { ConnectionError, SqlError } from "effect/sql/SqlError"

const event = Hooks.lifecycleEvent({
  id: Hooks.LifecycleEventId.make("event"),
  occurredAtMillis: 0,
  snapshot: { action: "sign-in", operation: "test/sign-in", identifiers: [] }
})

// 525916648 reports after contribution normalization and catches cancellation.
// A live hook cannot reliably force these causes or assert logger ownership.
it.effect("reports the original hook failure once using the invocation logger", () =>
  Effect.gen(function*() {
    const hook = Hooks.hookContribution("test/failure")
    const captured: Array<Cause.Cause<unknown>> = []

    const failure = SqlError.make({
      reason: ConnectionError.make({ cause: { code: "ECONNRESET", message: "private-hook" } })
    })

    const services = yield* Layer.build(
      Hooks.composeHooks(hook).pipe(
        Layer.provide(hook.layer({ after: () => Effect.fail(failure) })),
        Layer.provide(Logger.layer([]))
      )
    )

    const hooks = yield* Hooks.LifecycleHooks.pipe(Effect.provide(services))

    const result = yield* hooks
      .after(event)
      .pipe(Effect.provide(Logger.layer([Logger.make((entry) => captured.push(entry.cause))])))

    assert.strictEqual(result[0]?.status, "failed")
    assert.lengthOf(captured, 1)
    assert.lengthOf(captured[0]!.reasons, 1)
    assert.containSubset(captured[0]?.reasons, [
      { _tag: "Fail", error: { reason: "ConnectionError", code: "ECONNRESET" } }
    ])
    assert.notInclude(JSON.stringify(captured), "private-hook")
  }))

it.effect("stops post-commit delivery on interruption", () =>
  Effect.gen(function*() {
    const cancelled = Hooks.hookContribution("test/cancelled")
    const next = Hooks.hookContribution("test/next")
    let delivered = false

    const result = yield* Effect.exit(
      Effect.flatMap(Hooks.LifecycleHooks, (hooks) => hooks.after(event)).pipe(
        Effect.provide(
          Hooks.composeHooks(cancelled, next).pipe(
            Layer.provide(
              Layer.mergeAll(
                cancelled.layer({ after: () => Effect.failCause(Cause.interrupt(123)) }),
                next.layer({
                  after: () =>
                    Effect.sync(() => {
                      delivered = true
                    })
                })
              )
            )
          )
        )
      )
    )

    assert.strictEqual(delivered, false)
    assert.strictEqual(Exit.isFailure(result) && Cause.hasInterrupts(result.cause), true)
  }))

it.effect("sanitizes foreign contributions without invoking error prototype traps", () =>
  Effect.gen(function*() {
    const captured: Array<Cause.Cause<unknown>> = []
    const contribution = Hooks.hookContribution("foreign-hook")

    const failure = new Proxy(Hooks.HookDeliveryFailed.make({}), {
      getPrototypeOf: () => {
        throw new Error("private-prototype-trap")
      }
    })

    const cause = Cause.fromReasons([
      Cause.makeFailReason(failure),
      Cause.makeDieReason(new Error("private-hook-defect")),
      Cause.makeInterruptReason(321)
    ])

    const result = yield* Effect.exit(
      Effect.flatMap(Hooks.LifecycleHooks, (hooks) => hooks.after(event)).pipe(
        Effect.provide([
          Hooks.composeHooks({
            ...contribution,
            resolve: Effect.succeed({ after: () => Effect.failCause(cause) })
          }).pipe(Layer.provide(contribution.layer({ after: () => Effect.void }))),
          Logger.layer([Logger.make((entry) => captured.push(entry.cause))])
        ])
      )
    )

    assert.strictEqual(Exit.isFailure(result) && Cause.hasInterrupts(result.cause), true)
    assert.strictEqual(Exit.isFailure(result) && Cause.hasDies(result.cause), true)
    assert.lengthOf(captured, 1)
    assert.notInclude(JSON.stringify([result, captured]), "private-")
  }))
