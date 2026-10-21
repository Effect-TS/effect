import * as Password from "@effect/auth/Password"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Redacted } from "effect"
import { TestClock } from "effect/testing"

// Requested hardening: a stalled screening provider must fail closed and release its resources.
it.effect("times out stalled screening without retrying it", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const completed = yield* Deferred.make<void>()
    let calls = 0
    let released = false

    const screening = Layer.succeed(Password.CompromisedPasswords, {
      check: Effect.fnUntraced(
        function*() {
          calls++
          yield* Deferred.succeed(started, undefined)

          return yield* Effect.never
        },
        Effect.ensuring(
          Effect.sync(() => {
            released = true
          })
        )
      )
    })

    const fiber = yield* Effect.flatMap(Password.NewPasswordCheck, (service) =>
      service.check(Redacted.make("a sufficiently long synthetic password"))).pipe(
        Effect.provide(Password.NewPasswordCheck.layer().pipe(Layer.provide(screening))),
        Effect.result,
        Effect.tap(() =>
          Deferred.succeed(completed, undefined)
        ),
        Effect.forkChild
      )

    yield* Deferred.await(started)
    yield* TestClock.adjust("10 seconds")
    assert.strictEqual(yield* Deferred.isDone(completed), true)
    const result = yield* Fiber.join(fiber)
    assert.deepInclude(result, { _tag: "Failure" })
    assert.nestedPropertyVal(result, "failure._tag", "PasswordCheckUnavailable")
    assert.strictEqual(calls, 1)
    assert.strictEqual(released, true)
  }))
