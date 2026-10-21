import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { makeEmailLink } from "../emailDelivery/link.ts"
import { EmailRenderer } from "../emailDelivery/render.ts"
import { EmailDelivery, EmailMessage } from "../emailDelivery/service.ts"
import { reportAuthFailure } from "../shared/diagnostics.ts"
import type { ProofSecretPolicy } from "./crypto.ts"
import { type ProofDelivery, proofDeliveryLayer } from "./delivery.ts"
import { ProofConfigurationError } from "./errors.ts"

/** Internal bridge from proof dispatch to rendered email. Transports never see proof formats. */
export class EmailProofDelivery extends Context.Service<EmailProofDelivery, ProofDelivery>()(
  "@effect/auth/internal/EmailProofDelivery"
) {}

/** @internal */
export const emailProofDeliveryLayer = (options: {
  readonly secret: ProofSecretPolicy
  readonly url?: string
}) =>
  Layer.unwrap(
    Effect.gen(function*() {
      const delivery = yield* EmailDelivery
      const renderer = yield* EmailRenderer

      const link = options.secret._tag === "Token" ? yield* makeEmailLink(options.url ?? "") : undefined

      return proofDeliveryLayer(
        EmailProofDelivery,
        Effect.fnUntraced(function*(message) {
          if (message.recipient.namespace !== "email") {
            return { _tag: "DefiniteFailure", reason: "policy" } as const
          }

          const content = message.format === "numeric-code"
            ? { _tag: "Code" as const, code: message.secret }
            : link === undefined
            ? yield* ProofConfigurationError.make({ reason: "delivery" })
            : { _tag: "Link" as const, url: yield* link(message) }

          const rendered = yield* renderer.render({
            purpose: message.purpose,
            content,
            expiresAtMillis: message.expiresAtMillis,
            locale: message.locale
          })

          const email = yield* Schema.decodeEffect(EmailMessage)({
            ...rendered,
            to: message.recipient.value
          })

          return yield* Effect.suspend(() => delivery.send(email)).pipe(
            // Provider exceptions can contain cleartext bodies and capability URLs.
            Effect.withTracerEnabled(false),
            Effect.as({ _tag: "Accepted" } as const),
            Effect.catchCause((cause) => {
              if (Cause.hasDies(cause) || Cause.hasInterrupts(cause)) {
                return Effect.failCause(cause)
              }

              return reportAuthFailure("proof-delivery", cause).pipe(
                Effect.as(
                  cause.reasons.every(
                      (reason) => Cause.isFailReason(reason) && reason.error._tag === "EmailNotAccepted"
                    )
                    ? ({ _tag: "DefiniteFailure", reason: "unavailable" } as const)
                    : ({ _tag: "Ambiguous" } as const)
                )
              )
            })
          )
        })
      )
    })
  )
