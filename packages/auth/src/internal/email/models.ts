import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { LoginIdentifier } from "../identity/models.ts"
import { AuthenticationRequirement, AuthenticationRevision, SecurityRevision } from "../sessions/models.ts"

export const EmailCommandId = Schema.NonEmptyString.check(Schema.isMaxLength(256)).pipe(
  Schema.brand("effect-auth/EmailCommandId")
)

export type EmailCommandId = typeof EmailCommandId.Type

export const SafeReturnTarget = Schema.NonEmptyString.check(Schema.isMaxLength(2048)).pipe(
  Schema.brand("effect-auth/SafeReturnTarget")
)

export type SafeReturnTarget = typeof SafeReturnTarget.Type

export const EmailCredentialSnapshot = Schema.Struct({
  /** Current policy from the same authoritative read as the revision vector. */
  requirement: AuthenticationRequirement,
  moduleId: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
  identifier: LoginIdentifier,
  identifierRevision: SecurityRevision,
  verifiedAtMillis: Schema.Int,
  credentialId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  credentialRevision: SecurityRevision,
  revision: AuthenticationRevision
})

export type EmailCredentialSnapshot = typeof EmailCredentialSnapshot.Type
export const EmailAction = Schema.Literals(["verify-address", "change-address"])
export type EmailAction = typeof EmailAction.Type

/** Target-mailbox possession is NOT authorization to change a subject's identifier. */
export const EmailActionChallenge = Schema.Struct({
  moduleId: Schema.NonEmptyString,
  action: EmailAction,
  commandId: EmailCommandId,
  revision: AuthenticationRevision,
  sourceCredentialId: Schema.optionalKey(Schema.NonEmptyString),
  /** Existing unverified identifier already bound to this subject. */
  targetIdentifierRevision: Schema.optionalKey(SecurityRevision),
  target: LoginIdentifier,
  bindingDigest: TokenDigest
})

export type EmailActionChallenge = typeof EmailActionChallenge.Type
export type EmailAddressDecision = "changed" | "rejected"

export type EmailRegistrationDecision =
  | { readonly _tag: "Registered" }
  | { readonly _tag: "Rejected" }
