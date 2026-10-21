import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { PreparedCommit } from "../hooks/commit.ts"
import type { PrepareOAuthCommit } from "./oauthSignInPersistence.ts"
import { OAuthRegistrationIntent } from "./registrationModels.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"

export const OAuthRegistrationIssueDecision = Schema.Union([
  Schema.TaggedStruct("RegistrationIssued", { intent: OAuthRegistrationIntent }),
  Schema.TaggedStruct("Rejected", {})
])

export type OAuthRegistrationIssueDecision = typeof OAuthRegistrationIssueDecision.Type

/** Optional restricted intent issuance after a consumed sign-in flow and one
 * verified provider exchange. Check unknown full-tuple ownership and eligibility
 * in the inserting owner; disabled or connected-only ownership is not unknown.
 * No unknown-identity reservation is created and no subject is provisioned here.
 * Confirm the exact binder, identity and immutable horizons before releasing the
 * private registration credential. An unknown commit releases none and never
 * authorizes another exchange or automatic intent issuance. */
export class OAuthRegistrationIntents extends Context.Service<
  OAuthRegistrationIntents,
  {
    readonly issue: <A>(
      input: { readonly intent: OAuthRegistrationIntent },
      prepare: PrepareOAuthCommit<OAuthRegistrationIssueDecision, A>
    ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
  }
>()("@effect/auth/OAuthRegistrationIntents") {}
