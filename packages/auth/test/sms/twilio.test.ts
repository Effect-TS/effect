import { SmsDelivery } from "@effect/auth/SmsDelivery"
import * as Twilio from "@effect/auth/Twilio"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Redacted } from "effect"
import { HttpClient } from "effect/http"
import { TestClock } from "effect/testing"

const configuration = Layer.succeed(Twilio.TwilioConfig, {
  accountSid: `AC${"0".repeat(32)}`,
  authToken: Redacted.make("test-token"),
  from: "+14155550100"
})

const message = { id: "delivery-1", to: "+14155550123", body: Redacted.make("Code: 123456") }
const send = Effect.flatMap(SmsDelivery, (sms) => sms.send(message))

it.effect("times out ambiguously without repeating a send", () =>
  Effect.gen(function*() {
    let calls = 0
    let aborted = false
    const started = yield* Deferred.make<void>()

    const client = HttpClient.make((_request, _url, signal) =>
      Effect.gen(function*() {
        calls++
        signal.addEventListener(
          "abort",
          () => {
            aborted = true
          },
          { once: true }
        )
        yield* Deferred.succeed(started, undefined)

        return yield* Effect.never
      })
    )

    const live = Twilio.layer.pipe(
      Layer.provide(configuration),
      Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
    )

    const fiber = yield* send.pipe(Effect.provide(live), Effect.forkChild)

    yield* Deferred.await(started)
    yield* TestClock.adjust("10 seconds")
    assert.deepEqual(yield* Fiber.join(fiber), { _tag: "Ambiguous" })
    assert.strictEqual(calls, 1)
    assert.strictEqual(aborted, true)
  }))
