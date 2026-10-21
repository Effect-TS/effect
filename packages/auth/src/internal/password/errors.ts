import * as Schema from "effect/Schema"

export class PasswordHashingUnavailable extends Schema.TaggedError<PasswordHashingUnavailable>()(
  "PasswordHashingUnavailable",
  {}
) {}

export class PasswordKdfBusy extends Schema.TaggedError<PasswordKdfBusy>()("PasswordKdfBusy", {}) {}

export class PasswordInputInvalid extends Schema.TaggedError<PasswordInputInvalid>()(
  "PasswordInputInvalid",
  { reason: Schema.Literals(["too-long", "ill-formed"]) }
) {}

/** Internal verifier diagnostics; authentication operations must use a uniform public failure. */
export class PasswordVerifierInvalid extends Schema.TaggedError<PasswordVerifierInvalid>()(
  "PasswordVerifierInvalid",
  { reason: Schema.Literals(["malformed", "work-limit"]) }
) {}

export class PasswordConfigurationError extends Schema.TaggedError<PasswordConfigurationError>()(
  "PasswordConfigurationError",
  { component: Schema.Literals(["hashing", "admission", "policy"]) }
) {}

export class NewPasswordRejected extends Schema.TaggedError<NewPasswordRejected>()(
  "NewPasswordRejected",
  {
    reason: Schema.Literals([
      "too-short",
      "too-long",
      "ill-formed",
      "compromised",
      "common",
      "contextual"
    ])
  }
) {}

export class PasswordCheckUnavailable extends Schema.TaggedError<PasswordCheckUnavailable>()(
  "PasswordCheckUnavailable",
  {}
) {}
