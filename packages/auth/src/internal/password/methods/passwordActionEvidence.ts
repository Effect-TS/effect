import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../../operations/context.ts"
import type { ProofRedemptionInput } from "../../proofs/models.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../../sessions/models.ts"
import type { PasswordActionRequired, PasswordUnavailable } from "./errors.ts"
import type { PasswordActionChallenge } from "./models.ts"

/** Independently verify action-specific evidence against this exact challenge.
 * proof means fresh independently verifiable input for THIS call. Hashing uses
 * a new salt each retry: a grant bound to an earlier challenge cannot be resumed
 * here. The application may instead accept recent passkey step-up assurance from
 * invocation.assurance, using authenticatedAt and the factor actually verified
 * within the action's maximum evidence age. Bind that evidence to this challenge;
 * the password owner rechecks its current revisions and freshness at commit.
 * Consume replay-sensitive factor input in its OWN authority before returning.
 * A later rejected password mutation does not refund that factor; retries need
 * fresh evidence. Mere replay-counter/code consumption preserves semantic factor
 * revision; factor replacement/revocation changes it and wins the final password CAS.
 * This port has no atomic factor-consumption/password-write plan.
 * No default permits mutation. Login-pending credentials are not action grants.
 * A session is usable only with current revision/factor authority; an unexpired
 * pure-stateless caller alone does not prove current credential-change authority.
 * Current recovery policy may accept a reset candidate for a single-factor
 * subject, but it must never erase/bypass enabled MFA. No client factor assertions.
 */
export class PasswordActionEvidence extends Context.Service<
  PasswordActionEvidence,
  {
    readonly verify: (input: {
      readonly challenge: PasswordActionChallenge
      readonly invocation: AuthInvocation
      readonly proof?: Redacted.Redacted<string>
      readonly currentPasswordEvidence?: AuthenticationEvidence
      readonly recovery?: ProofRedemptionInput
    }) => Effect.Effect<
      {
        readonly evidence: AuthenticationEvidence
        readonly requirement: AuthenticationRequirement
      },
      PasswordActionRequired | PasswordUnavailable
    >
  }
>()("@effect/auth/PasswordActionEvidence") {}
