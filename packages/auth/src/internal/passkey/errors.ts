import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
export class PasskeyRejected extends Schema.TaggedError<PasskeyRejected>()("PasskeyRejected", {}) {}

export class PasskeyUnavailable extends Schema.TaggedError<PasskeyUnavailable>()(
  "PasskeyUnavailable",
  {}
) {}

export class PasskeyActionRequired extends Schema.TaggedError<PasskeyActionRequired>()(
  "PasskeyActionRequired",
  {}
) {}

export class PasskeyMethodUnsupported extends Schema.TaggedError<PasskeyMethodUnsupported>()(
  "PasskeyMethodUnsupported",
  {}
) {}

export class PasskeyConfigurationError extends Schema.TaggedError<PasskeyConfigurationError>()(
  "PasskeyConfigurationError",
  {}
) {}

export class PasskeyProtocolRejected extends Schema.TaggedError<PasskeyProtocolRejected>()(
  "PasskeyProtocolRejected",
  {}
) {}

export const PasskeyFailure = Schema.Union([
  PasskeyRejected,
  PasskeyUnavailable,
  PasskeyActionRequired,
  PasskeyMethodUnsupported,
  HookDenied
])

export type PasskeyFailure = typeof PasskeyFailure.Type
