import * as Schema from "effect/Schema"

import { HookDenied } from "../hooks/models.ts"
export class TotpRejected extends Schema.TaggedError<TotpRejected>()("TotpRejected", {}) {}
export class TotpUnavailable extends Schema.TaggedError<TotpUnavailable>()("TotpUnavailable", {}) {}

export class TotpConfigurationError extends Schema.TaggedError<TotpConfigurationError>()(
  "TotpConfigurationError",
  {}
) {}

export class TotpActionRequired extends Schema.TaggedError<TotpActionRequired>()(
  "TotpActionRequired",
  {}
) {}

export const TotpFailure = Schema.Union([
  TotpRejected,
  TotpUnavailable,
  TotpConfigurationError,
  TotpActionRequired,
  HookDenied
])

export type TotpFailure = typeof TotpFailure.Type
