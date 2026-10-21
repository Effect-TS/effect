import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../sessions/models.ts"
import type { OAuthActionSource } from "./accountsModels.ts"
import type { OAuthConnectedActionChallenge, OAuthConnectedActionRequired } from "./connectedModels.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"

/** Independent exact-action authority. Consume one-time evidence before returning;
 * later connected CAS loss does not refund it. No session-summary default. */
export class OAuthConnectedActionEvidence extends Context.Service<
  OAuthConnectedActionEvidence,
  {
    readonly verify: (input: {
      readonly invocation: AuthInvocation
      readonly challenge: OAuthConnectedActionChallenge
      readonly proof?: Redacted.Redacted<string>
    }) => Effect.Effect<
      {
        readonly source: OAuthActionSource
        readonly evidence: AuthenticationEvidence
        readonly requirement: AuthenticationRequirement
      },
      OAuthConnectedActionRequired | OAuthUnavailable
    >
  }
>()("@effect/auth/OAuthConnectedActionEvidence") {}
