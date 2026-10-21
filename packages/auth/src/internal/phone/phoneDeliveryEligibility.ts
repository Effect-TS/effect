import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type { PhoneNumber, PhoneOtpUnavailable } from "./models.ts"

/** Consumer controls supported numbering ranges, sender/template eligibility and vendor rules. */
export class PhoneDeliveryEligibility extends Context.Service<
  PhoneDeliveryEligibility,
  { readonly allowed: (phoneNumber: PhoneNumber) => Effect.Effect<boolean, PhoneOtpUnavailable> }
>()("@effect/auth/PhoneDeliveryEligibility") {}
