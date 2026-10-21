import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import { type ProofDelivery, proofDeliveryLayer, type ProofDeliveryMessage } from "./delivery.ts"
import type { ProofDeliveryOutcome } from "./models.ts"

/** The consumer owns number/country eligibility, sender identity and vendor spend policy. */
export class SmsProofDelivery extends Context.Service<SmsProofDelivery, ProofDelivery>()(
  "@effect/auth/SmsProofDelivery"
) {
  static readonly layer = <E, R>(
    send: (message: ProofDeliveryMessage) => Effect.Effect<ProofDeliveryOutcome, E, R>
  ) => proofDeliveryLayer(this, send)
}
