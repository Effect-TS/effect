import * as Schema from "effect/Schema"

export class OperationHttpConfigurationError extends Schema.TaggedError<OperationHttpConfigurationError>()(
  "OperationHttpConfigurationError",
  {
    reason: Schema.Literals([
      "route",
      "duplicate-route",
      "duplicate-operation",
      "internal-operation",
      "credentials",
      "cookies",
      "csrf",
      "body-limit",
      "url-limit",
      "native-headers",
      "origin",
      "callback",
      "redirect"
    ])
  }
) {}

export class OperationHttpError extends Schema.TaggedError<OperationHttpError>()(
  "OperationHttpError",
  {
    reason: Schema.Literals([
      "request",
      "not-found",
      "method",
      "origin",
      "csrf",
      "credentials",
      "too-large",
      "response",
      "network",
      "timeout",
      "stale-response",
      "private-output",
      "unavailable"
    ])
  }
) {}
