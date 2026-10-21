import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { ProofDeliveryOutcome } from "../proofs/models.ts"

export interface SmsMessage {
  readonly id: string
  readonly to: string
  readonly body: Redacted.Redacted<string>
}

/** Required SMS transport. Acceptance is not confirmation of delivery to the handset. */
export class SmsDelivery extends Context.Service<
  SmsDelivery,
  {
    readonly send: (message: SmsMessage) => Effect.Effect<ProofDeliveryOutcome>
  }
>()("@effect/auth/SmsDelivery") {}
