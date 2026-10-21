import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
import { RequestBindingInvalid } from "../operations/requestBinding.ts"
import { ProofIngressDenied, ProofInvalid } from "../proofs/errors.ts"
import {
  PendingAuthenticationInvalid,
  SessionConflict,
  SessionInvalid,
  StaleAuthentication
} from "../sessions/errors.ts"
import { PhoneActionRequired } from "./lifecycleModels.ts"
import { PhoneOtpRejected, PhoneOtpUnavailable } from "./models.ts"

/**
 * An unavailable/ambiguous commit cannot truthfully be reported as rejected.
 *
 * @internal
 */
export const phoneFailure = (
  error: unknown
): PhoneOtpRejected | PhoneOtpUnavailable | HookDenied => {
  if (Schema.is(HookDenied)(error)) return error
  if (Schema.is(PhoneOtpUnavailable)(error)) return error
  if (
    Schema.is(PhoneOtpRejected)(error) ||
    Schema.is(RequestBindingInvalid)(error) ||
    Schema.is(ProofInvalid)(error) ||
    Schema.is(ProofIngressDenied)(error) ||
    Schema.is(StaleAuthentication)(error) ||
    Schema.is(PendingAuthenticationInvalid)(error) ||
    Schema.is(SessionInvalid)(error) ||
    Schema.is(SessionConflict)(error)
  ) {
    return PhoneOtpRejected.make({})
  }

  return PhoneOtpUnavailable.make({})
}

/** @internal */
export const phoneActionFailure = (error: unknown) => {
  const failure = phoneFailure(error)

  return failure._tag === "PhoneOtpRejected" ? PhoneActionRequired.make({}) : failure
}
