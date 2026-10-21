/**
 * Twilio configuration and SMS delivery.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Uses Twilio's Messages REST API. Supply a non-retrying HTTP client. Unknown send outcomes are
   * never retried. Scope aborts/releases every response. Request bodies, credentials, and provider
   * error bodies stay outside telemetry.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer
} from "./internal/sms/twilio.ts"
export {
  /**
   * Service supplying Twilio credentials, sender identity, and delivery configuration.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  TwilioConfig,
  /**
   * Failure indicating invalid Twilio credentials or sender configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  TwilioConfigurationError
} from "./internal/sms/twilioConfig.ts"
