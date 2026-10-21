import * as Schema from "effect/Schema"

import { TokenDigest } from "../../../Schema.ts"
import { LoginIdentifier } from "../../identity/models.ts"
import type { AuthenticationEvidence, AuthenticationRequirement } from "../../sessions/models.ts"
import { AuthenticationRevision, SecurityRevision } from "../../sessions/models.ts"
import { EncodedPasswordHash } from "../models.ts"
import { PasswordNormalization } from "../policy.ts"

export const PasswordCommandId = Schema.NonEmptyString.check(Schema.isMaxLength(256)).pipe(
  Schema.brand("effect-auth/PasswordCommandId")
)

export type PasswordCommandId = typeof PasswordCommandId.Type

export const PasswordReplacement = Schema.Struct({
  verifier: Schema.RedactedFromValue(EncodedPasswordHash),
  normalization: PasswordNormalization
})

export type PasswordReplacement = typeof PasswordReplacement.Type

/** Private coherent snapshot with the complete active factor revision vector.
 * The vector does not prove those factors; proofs identify actual verifications.
 * Verifier version changes on rehash; semantic revisions do not. */
export const PasswordCredentialSnapshot = Schema.Struct({
  moduleId: Schema.NonEmptyString,
  revision: AuthenticationRevision,
  credentialId: Schema.NonEmptyString,
  credentialRevision: SecurityRevision,
  verifierVersion: SecurityRevision,
  verifier: Schema.RedactedFromValue(EncodedPasswordHash),
  normalization: PasswordNormalization,
  identifier: LoginIdentifier,
  identifierBindingRevision: SecurityRevision,
  identifierVerifiedAtMillis: Schema.optionalKey(Schema.Int)
})

export type PasswordCredentialSnapshot = typeof PasswordCredentialSnapshot.Type

export const PasswordAction = Schema.Literals([
  "add-password",
  "change-password",
  "reset-password"
])

export type PasswordAction = typeof PasswordAction.Type

/** Server-internal exact mutation binding, never a public credential or password hash. */
export const PasswordActionChallenge = Schema.Struct({
  moduleId: Schema.NonEmptyString,
  action: PasswordAction,
  commandId: PasswordCommandId,
  revision: AuthenticationRevision,
  targetCredentialId: Schema.optionalKey(Schema.NonEmptyString),
  bindingDigest: TokenDigest
})

export type PasswordActionChallenge = typeof PasswordActionChallenge.Type

export interface PasswordActionAuthorization {
  readonly challenge: PasswordActionChallenge
  readonly evidence: AuthenticationEvidence
  readonly requirement: AuthenticationRequirement
}

export type PasswordMutationDecision = "changed" | "rejected"
