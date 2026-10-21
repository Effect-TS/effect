import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../sessions/models.ts"
import type { OAuthActionChallenge, OAuthActionRequired, OAuthActionSource } from "./accountsModels.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"

/** Application action authority; no default grants access. Verify the exact
 * challenge and revisions. A one-shot proof is consumed in its own authority.
 * Recent session step-up may be accepted only after matching this invocation to
 * its real private provenance, factor IDs/revisions and original proof times;
 * public assurance ordinals must never be converted into credential IDs. Return
 * Session source with the exact session ID and authenticatedAt. Core also checks
 * both authentication and factor freshness. Link retains this begin authorization
 * and requires no second proof at completion. Pending/registration capabilities
 * do not authorize account changes.
 * Counter consumption need not replace semantic credential revision; replacement,
 * revocation and policy/binding changes must advance the corresponding revisions.
 * A later OAuth CAS rejection does not refund a factor or imply an atomic join.
 */
export class OAuthActionEvidence extends Context.Service<
  OAuthActionEvidence,
  {
    readonly verify: (input: {
      readonly invocation: AuthInvocation
      readonly challenge: OAuthActionChallenge
      readonly proof?: Redacted.Redacted<string>
    }) => Effect.Effect<
      {
        readonly source: OAuthActionSource
        readonly evidence: AuthenticationEvidence
        readonly requirement: AuthenticationRequirement
      },
      OAuthActionRequired | OAuthUnavailable
    >
  }
>()("@effect/auth/OAuthActionEvidence") {}
