import * as Schema from "effect/Schema"

export class SessionInvalid extends Schema.TaggedError<SessionInvalid>()("SessionInvalid", {}) {}

export class SessionUnavailable extends Schema.TaggedError<SessionUnavailable>()(
  "SessionUnavailable",
  {}
) {}

export class StaleAuthentication extends Schema.TaggedError<StaleAuthentication>()(
  "StaleAuthentication",
  {}
) {}

export class SessionRenewalTooEarly extends Schema.TaggedError<SessionRenewalTooEarly>()(
  "SessionRenewalTooEarly",
  { retryAt: Schema.DateTimeUtcFromMillis }
) {}

export class SessionConflict extends Schema.TaggedError<SessionConflict>()("SessionConflict", {}) {}

export class SessionCapabilityUnsupported extends Schema.TaggedError<SessionCapabilityUnsupported>()(
  "SessionCapabilityUnsupported",
  { capability: Schema.NonEmptyString }
) {}

export class SessionConfigurationError extends Schema.TaggedError<SessionConfigurationError>()(
  "SessionConfigurationError",
  {
    reason: Schema.Literals([
      "policy",
      "keyring",
      "claims",
      "capability",
      "pending-authentication",
      "step-up"
    ])
  }
) {}

export class PendingAuthenticationInvalid extends Schema.TaggedError<PendingAuthenticationInvalid>()(
  "PendingAuthenticationInvalid",
  {}
) {}

export class SessionStepUpInvalid extends Schema.TaggedError<SessionStepUpInvalid>()(
  "SessionStepUpInvalid",
  {}
) {}

export class SessionSignOutUnavailable extends Schema.TaggedError<SessionSignOutUnavailable>()(
  "SessionSignOutUnavailable",
  { clearCredential: Schema.Literal(true) }
) {}

export const SessionError = Schema.Union([
  SessionInvalid,
  SessionUnavailable,
  StaleAuthentication,
  SessionConflict,
  SessionRenewalTooEarly,
  SessionCapabilityUnsupported,
  PendingAuthenticationInvalid,
  SessionStepUpInvalid,
  SessionSignOutUnavailable
])

export type SessionError = typeof SessionError.Type
