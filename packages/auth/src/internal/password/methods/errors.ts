import * as Schema from "effect/Schema"

export class PasswordRejected extends Schema.TaggedError<PasswordRejected>()(
  "PasswordRejected",
  {}
) {}

export class PasswordUnavailable extends Schema.TaggedError<PasswordUnavailable>()(
  "PasswordUnavailable",
  {}
) {}

export class PasswordActionRequired extends Schema.TaggedError<PasswordActionRequired>()(
  "PasswordActionRequired",
  {}
) {}

export class PasswordMethodUnsupported extends Schema.TaggedError<PasswordMethodUnsupported>()(
  "PasswordMethodUnsupported",
  {}
) {}

export class PasswordMethodConfigurationError extends Schema.TaggedError<PasswordMethodConfigurationError>()(
  "PasswordMethodConfigurationError",
  {}
) {}
