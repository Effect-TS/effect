import * as Schema from "effect/Schema"

import { SubjectId } from "../../Schema.ts"

/** Namespace and normalization are supplied by the method/consumer, not email. */
export class LoginIdentifier extends Schema.Class<LoginIdentifier>("effect-auth/LoginIdentifier")({
  namespace: Schema.NonEmptyString,
  value: Schema.NonEmptyString
}) {}

/** Stable provider identity. Matching profile email addresses do not imply a link. */
export class ExternalIdentity extends Schema.Class<ExternalIdentity>(
  "effect-auth/ExternalIdentity"
)({
  provider: Schema.NonEmptyString,
  issuer: Schema.NonEmptyString,
  subject: Schema.NonEmptyString
}) {}

/** A non-secret reference; never a bearer credential or a recovery code. */
export const CredentialId = Schema.NonEmptyString.pipe(Schema.brand("effect-auth/CredentialId"))
export type CredentialId = typeof CredentialId.Type

export class IdentifierBinding extends Schema.Class<IdentifierBinding>(
  "effect-auth/IdentifierBinding"
)({
  identifier: LoginIdentifier,
  subjectId: SubjectId,
  verifiedAt: Schema.Option(Schema.DateTimeUtcFromMillis)
}) {}

export class CredentialSummary extends Schema.Class<CredentialSummary>(
  "effect-auth/CredentialSummary"
)({
  id: CredentialId,
  method: Schema.NonEmptyString,
  createdAt: Schema.DateTimeUtcFromMillis,
  /** A second factor by itself must not count as a remaining sign-in method. */
  usableForSignIn: Schema.Boolean
}) {}

export class SubjectSnapshot extends Schema.Class<SubjectSnapshot>("effect-auth/SubjectSnapshot")({
  subjectId: SubjectId,
  status: Schema.Literals(["active", "disabled", "deleting"])
}) {}

export class SubjectProvisioned extends Schema.TaggedClass<SubjectProvisioned>()(
  "SubjectProvisioned",
  { subjectId: SubjectId }
) {}

/** Expected identity failures contain no identifier value or database diagnostics. */
export class IdentityConflict extends Schema.TaggedError<IdentityConflict>()(
  "IdentityConflict",
  {}
) {}

export class IdentityUnavailable extends Schema.TaggedError<IdentityUnavailable>()(
  "IdentityUnavailable",
  {}
) {}

export class LastSignInMethod extends Schema.TaggedError<LastSignInMethod>()(
  "LastSignInMethod",
  {}
) {}

export class SubjectInactive extends Schema.TaggedError<SubjectInactive>()("SubjectInactive", {}) {}
