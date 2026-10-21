import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../sessions/models.ts"
import type { EmailActionRequired, EmailUnavailable } from "./errors.ts"
import type { EmailActionChallenge } from "./models.ts"

export interface EmailActionAuthorization {
  readonly challenge: EmailActionChallenge
  readonly evidence: AuthenticationEvidence
  readonly requirement: AuthenticationRequirement
}

/** Current subject/action authority; no default grants mutations. Target email
 * proof and login-pending credentials never satisfy this independent authorization.
 * Consume replay-sensitive factors in their own authority before returning; later
 * identity CAS failure does not refund them. Counter advancement preserves semantic
 * factor revision, while revocation/replacement changes it and wins final CAS.
 * Request and completion each require authorization. Existing-identifier confirmation
 * may use a valid session under application policy; adding or replacing an identifier
 * requires fresh authorization bounded by EmailAddressPolicy.
 * no promise that a consumed one-time factor can be resubmitted at completion.
 */
export class EmailActionEvidence extends Context.Service<
  EmailActionEvidence,
  {
    readonly verify: (input: {
      readonly invocation: AuthInvocation
      readonly challenge: EmailActionChallenge
      readonly proof?: Redacted.Redacted<string>
    }) => Effect.Effect<
      {
        readonly evidence: AuthenticationEvidence
        readonly requirement: AuthenticationRequirement
      },
      EmailActionRequired | EmailUnavailable
    >
  }
>()("@effect/auth/EmailActionEvidence") {}
