import * as Schema from "effect/Schema"

/** Diagnostics contain only fixed classifications, never native causes or input. */
export class InvalidInput extends Schema.TaggedError<InvalidInput>()("CryptoInvalidInput", {
  reason: Schema.Literals(["key", "nonce", "parameters", "data"])
}) {}

export class UnsupportedAlgorithm extends Schema.TaggedError<UnsupportedAlgorithm>()(
  "CryptoUnsupportedAlgorithm",
  {}
) {}

/** A native backend failed without a more specific classification. */
export class CryptoUnavailable extends Schema.TaggedError<CryptoUnavailable>()(
  "CryptoUnavailable",
  {}
) {}

export type OperationError = InvalidInput | UnsupportedAlgorithm | CryptoUnavailable
