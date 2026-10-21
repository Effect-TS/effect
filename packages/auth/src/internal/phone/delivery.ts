import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

import { SmsProofDelivery } from "../proofs/smsProofDelivery.ts"
import { SmsDelivery } from "../sms/smsDelivery.ts"
import { Template } from "./template.ts"

/**
 * Render inside the private, locally once delivery task; the transport never receives proof internals.
 *
 * @internal
 */
export const deliveryLayer = Layer.unwrap(
  Effect.gen(function*() {
    const delivery = yield* SmsDelivery
    const template = yield* Template

    return SmsProofDelivery.layer((message) =>
      Effect.suspend(() =>
        delivery.send({
          id: message.deliveryId,
          to: message.recipient.value,
          body: Redacted.make(template.render(Redacted.value(message.secret), message))
        })
      )
    )
  })
)
