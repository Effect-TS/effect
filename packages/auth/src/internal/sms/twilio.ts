import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { ProofDeliveryOutcome } from "../proofs/models.ts"
import { reportAuthFailure, ReportedOperationDefect } from "../shared/diagnostics.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import { SmsDelivery, type SmsMessage } from "./smsDelivery.ts"
import { TwilioConfig, TwilioConfiguration, TwilioConfigurationError } from "./twilioConfig.ts"

/** Uses Twilio's Messages REST API. Supply a non-retrying HTTP client.
 * Unknown send outcomes are never retried. Scope aborts/releases every response.
 * Request bodies, credentials, and provider error bodies stay outside telemetry.
 */
export const layer = Layer.effect(
  SmsDelivery,
  Effect.gen(function*() {
    const config = yield* Schema.decodeEffect(TwilioConfiguration)(yield* TwilioConfig).pipe(
      Effect.mapError(() => TwilioConfigurationError.make({}))
    )

    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`

    const send = Effect.fn("Twilio.send")(function*(message: SmsMessage) {
      const request = HttpClientRequest.post(url).pipe(
        HttpClientRequest.basicAuth(config.accountSid, config.authToken),
        HttpClientRequest.bodyUrlParams({
          To: message.to,
          Body: Redacted.value(message.body),
          ...("from" in config
            ? { From: config.from }
            : { MessagingServiceSid: config.messagingServiceSid })
        })
      )

      return yield* Effect.uninterruptibleMask((restore) =>
        restore(
          client.execute(request).pipe(
            Effect.map((response): ProofDeliveryOutcome =>
              response.status === 201
                ? { _tag: "Accepted" }
                : response.status >= 400 && response.status < 500 && response.status !== 408
                ? { _tag: "DefiniteFailure", reason: "unavailable" }
                : { _tag: "Ambiguous" }
            ),
            Effect.scoped,
            timeoutWithCause("10 seconds")
          )
        ).pipe(
          Effect.catchCause((cause) => {
            if (Cause.hasInterruptsOnly(cause)) {
              return Effect.failCause(
                Cause.fromReasons<never>(cause.reasons.filter(Cause.isInterruptReason))
              )
            }

            return reportAuthFailure("proof-delivery", cause).pipe(
              Effect.andThen(
                Cause.hasDies(cause) || Cause.hasInterrupts(cause)
                  ? Effect.failCause(
                    Cause.fromReasons<never>(
                      cause.reasons.map((reason) =>
                        Cause.isInterruptReason(reason)
                          ? Cause.makeInterruptReason(reason.fiberId)
                          : Cause.makeDieReason(ReportedOperationDefect.make({}))
                      )
                    )
                  )
                  : Effect.succeed<ProofDeliveryOutcome>({ _tag: "Ambiguous" })
              )
            )
          }),
          Effect.provideService(HttpClient.TracerDisabledWhen, () => true)
        )
      )
    })

    return { send }
  })
)
