import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../sessions/models.ts"
import type { PasskeyActionRequired, PasskeyUnavailable } from "./errors.ts"
import type { PasskeyActionChallenge } from "./models.ts"

/** Independent current action authority. Consume replay-sensitive input in its
 * own authority; later enrollment/removal failure never refunds it. Applications
 * may authorize enrollment from a valid session under their freshness policy,
 * preserving its original proof times and factors. Enrollment asks once at begin;
 * the saved authorization is re-assessed under the subject lock at completion.
 * Completion does not accept another action proof. No default. */
export class PasskeyActionEvidence extends Context.Service<
  PasskeyActionEvidence,
  {
    readonly verify: (input: {
      readonly invocation: AuthInvocation
      readonly challenge: PasskeyActionChallenge
      readonly proof?: Redacted.Redacted<string>
    }) => Effect.Effect<
      {
        readonly evidence: AuthenticationEvidence
        readonly requirement: AuthenticationRequirement
      },
      PasskeyActionRequired | PasskeyUnavailable
    >
  }
>()("@effect/auth/PasskeyActionEvidence") {}
