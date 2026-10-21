import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
import { ProofCapabilityUnsupported, ProofIngressDenied, ProofInvalid } from "../proofs/errors.ts"
import {
  PendingAuthenticationInvalid,
  SessionCapabilityUnsupported,
  SessionConflict,
  SessionInvalid,
  StaleAuthentication
} from "../sessions/errors.ts"

export class EmailRejected extends Schema.TaggedError<EmailRejected>()("EmailRejected", {}) {}

export class EmailUnavailable extends Schema.TaggedError<EmailUnavailable>()(
  "EmailUnavailable",
  {}
) {}

export class EmailActionRequired extends Schema.TaggedError<EmailActionRequired>()(
  "EmailActionRequired",
  {}
) {}

export class EmailMethodUnsupported extends Schema.TaggedError<EmailMethodUnsupported>()(
  "EmailMethodUnsupported",
  {}
) {}

export class EmailConfigurationError extends Schema.TaggedError<EmailConfigurationError>()(
  "EmailConfigurationError",
  {}
) {}

/**
 * Unknown completion/receipt failures may follow a durable write.
 *
 * @internal
 */
export const emailCompletionFailure = (
  error: unknown
): EmailRejected | EmailUnavailable | EmailMethodUnsupported | HookDenied => {
  if (Schema.is(HookDenied)(error)) return error
  if (Schema.is(Schema.Union([SessionCapabilityUnsupported, ProofCapabilityUnsupported]))(error)) {
    return EmailMethodUnsupported.make({})
  }
  if (
    Schema.is(
      Schema.Union([
        ProofIngressDenied,
        SessionInvalid,
        SessionConflict,
        PendingAuthenticationInvalid,
        StaleAuthentication,
        ProofInvalid
      ])
    )(error)
  ) {
    return EmailRejected.make({})
  }

  return EmailUnavailable.make({})
}
