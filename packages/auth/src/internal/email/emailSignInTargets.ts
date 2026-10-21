import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"

import type { LoginIdentifier } from "../identity/models.ts"
import type { EmailUnavailable } from "./errors.ts"
import type { EmailCredentialSnapshot } from "./models.ts"

/** The joined lookup returns the full current active-factor revision vector.
 * Active subject + verified exact identifier + active configured email credential.
 * Capture their SAME revisions before verification; absent/ineligible returns None.
 * Every identifier change invalidating captured login bumps subject securityRevision
 * atomically because AuthenticationRevision does not contain identifierRevision.
 */
export class EmailSignInTargets extends Context.Service<
  EmailSignInTargets,
  {
    readonly lookup: (input: {
      readonly moduleId: string
      readonly identifier: LoginIdentifier
    }) => Effect.Effect<Option.Option<EmailCredentialSnapshot>, EmailUnavailable>
  }
>()("@effect/auth/EmailSignInTargets") {}
