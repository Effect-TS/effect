import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthenticationEvidence } from "../sessions/models.ts"
import type { TotpActionRequired, TotpUnavailable } from "./errors.ts"
import type { TotpActionChallenge } from "./models.ts"

/** Fresh independent action proof, bound to the exact command. No weaker default exists. */
export class TotpActionEvidence extends Context.Service<
  TotpActionEvidence,
  {
    readonly verify: (input: {
      readonly invocation: AuthInvocation
      readonly challenge: TotpActionChallenge
      readonly proof?: Redacted.Redacted<string>
    }) => Effect.Effect<AuthenticationEvidence, TotpActionRequired | TotpUnavailable>
  }
>()("@effect/auth/TotpActionEvidence") {}
