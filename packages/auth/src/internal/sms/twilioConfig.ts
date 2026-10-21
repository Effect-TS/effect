import * as Context from "effect/Context"
import * as Schema from "effect/Schema"

const credentials = {
  accountSid: Schema.String.check(Schema.isPattern(/^AC[0-9a-fA-F]{32}$/)),
  authToken: Schema.Redacted(Schema.NonEmptyString)
}

/** @internal */
export const TwilioConfiguration = Schema.Union([
  Schema.Struct({ ...credentials, from: Schema.NonEmptyString }),
  Schema.Struct({
    ...credentials,
    messagingServiceSid: Schema.String.check(Schema.isPattern(/^MG[0-9a-fA-F]{32}$/))
  })
])

export class TwilioConfig extends Context.Service<TwilioConfig, typeof TwilioConfiguration.Type>()(
  "@effect/auth/TwilioConfig"
) {}

export class TwilioConfigurationError extends Schema.TaggedError<TwilioConfigurationError>()(
  "TwilioConfigurationError",
  {}
) {}
