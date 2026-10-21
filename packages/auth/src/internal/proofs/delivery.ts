import * as Cause from "effect/Cause"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { LoginIdentifier } from "../identity/models.ts"
import { reportAuthFailure } from "../shared/diagnostics.ts"
import { type ProofDeliveryId, ProofDeliveryOutcome, type ProofPurpose, type ProofReference } from "./models.ts"

export interface ProofDeliveryMessage {
  readonly deliveryId: ProofDeliveryId
  readonly purpose: ProofPurpose
  readonly reference: ProofReference
  readonly recipient: LoginIdentifier
  readonly secret: Redacted.Redacted<string>
  readonly format: "token" | "numeric-code"
  readonly expiresAtMillis: number
  readonly template: string
  readonly locale: string
}

export interface ProofDelivery {
  /** Acceptance by vendor is not delivery to the recipient. Typed failures become
   * ambiguous; defects/interruption propagate. The transport is invoked at most once
   * per committed issue in this process; no retry or external exactly-once claim.
   * No diagnostic/body escapes the public operation boundary. */
  readonly send: (message: ProofDeliveryMessage) => Effect.Effect<ProofDeliveryOutcome>
}

/** @internal */
export const proofDeliveryLayer = <Id, E, R>(
  service: Context.Key<Id, ProofDelivery>,
  send: (message: ProofDeliveryMessage) => Effect.Effect<ProofDeliveryOutcome, E, R>
) => {
  const callback = send

  return Layer.effect(
    service,
    Effect.gen(function*() {
      const services = yield* Effect.context<R>()

      return {
        send: (message: ProofDeliveryMessage) =>
          Effect.suspend(() => callback(message)).pipe(
            Effect.provide(services),
            Effect.flatMap(Schema.decodeEffect(ProofDeliveryOutcome)),
            Effect.catchCause((cause) =>
              Cause.hasDies(cause) || Cause.hasInterrupts(cause)
                ? Effect.failCause(
                  Cause.fromReasons<never>(
                    cause.reasons.map((reason) =>
                      Cause.isFailReason(reason)
                        ? Cause.makeDieReason(reason.error).annotate(
                          Cause.reasonAnnotations(reason)
                        )
                        : reason
                    )
                  )
                )
                : reportAuthFailure("proof-delivery", cause).pipe(
                  Effect.as({ _tag: "Ambiguous" as const })
                )
            )
          )
      }
    })
  )
}
